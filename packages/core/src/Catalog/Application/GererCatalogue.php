<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Application;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Model\Tarif;
use Bsandoz\Core\Catalog\Domain\Port\OptionRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Catalogue dans l'espace pro : prestations (tarifs par variante, options autorisées, durée incertaine) et options.
 * Rien n'est supprimé (les réservations passées y font référence) : on désactive.
 *
 * Prestation : {"name", "description", "basePriceCents", "baseDurationMin", "active", "categoryId", "position",
 *               "occupePlage", "tarifs": {"<variante>": {"priceCents", "durationMin"}}, "optionIds": []}
 * Option     : {"name", "description", "priceCents", "durationMin", "active"}
 */
final class GererCatalogue
{
    public function __construct(
        private PrestationRepository $prestations,
        private OptionRepository $options,
        private IdGenerator $ids,
    ) {
    }

    /** @return array{prestations: list<array<string, mixed>>, options: list<array<string, mixed>>} */
    public function lister(): array
    {
        return [
            'prestations' => array_map(self::prestationEnTableau(...), $this->prestations->all()),
            'options' => array_map(self::optionEnTableau(...), $this->options->all()),
        ];
    }

    /**
     * Crée (sans identifiant) ou modifie une prestation.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     * @throws DomainError données invalides ou option inconnue
     * @throws NotFound prestation inconnue
     */
    public function enregistrerPrestation(array $data, ?string $id = null): array
    {
        $name = self::texte($data, 'name');
        $basePrice = Money::cents(self::entier($data, 'basePriceCents'));
        $duration = self::entier($data, 'baseDurationMin');
        $prestation = $id === null ? new Prestation($this->ids->generate(), $name !== '' ? $name : 'x', $basePrice, max(1, $duration)) : $this->prestations->get($id);

        $categoryId = $data['categoryId'] ?? null;
        $prestation->modifier(
            $name,
            self::texte($data, 'description', ''),
            $basePrice,
            $duration,
            ($data['active'] ?? true) === true,
            is_string($categoryId) && $categoryId !== '' ? $categoryId : null,
            is_int($data['position'] ?? null) ? $data['position'] : 0,
            ($data['occupePlage'] ?? false) === true,
        );

        $tarifs = [];
        $donnees = $data['tarifs'] ?? [];
        if (!is_array($donnees)) {
            throw new DomainError('« tarifs » doit être un objet {variante: {priceCents, durationMin}}.');
        }
        foreach ($donnees as $variante => $tarif) {
            if (!is_array($tarif)) {
                throw new DomainError(sprintf('Tarif « %s » invalide.', $variante));
            }
            $tarifs[] = new Tarif((string) $variante, Money::cents(self::entier($tarif, 'priceCents')), self::entier($tarif, 'durationMin'));
        }
        $prestation->remplacerTarifs($tarifs);

        $optionIds = $data['optionIds'] ?? [];
        if (!is_array($optionIds) || array_filter($optionIds, static fn (mixed $o): bool => !is_string($o)) !== []) {
            throw new DomainError('« optionIds » doit être une liste d\'identifiants.');
        }
        /** @var list<string> $optionIds */
        $optionIds = array_values($optionIds);
        $this->options->getMany($optionIds);
        $prestation->remplacerOptions($optionIds);

        $this->prestations->save($prestation);

        return self::prestationEnTableau($prestation);
    }

    /** @throws NotFound */
    public function desactiverPrestation(string $id): void
    {
        $p = $this->prestations->get($id);
        $p->modifier($p->name(), $p->description(), $p->basePrice(), $p->baseDurationMin(), false, $p->categoryId(), $p->position(), $p->occupePlage());
        $this->prestations->save($p);
    }

    /**
     * Crée (sans identifiant) ou remplace une option.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     * @throws DomainError
     * @throws NotFound option inconnue
     */
    public function enregistrerOption(array $data, ?string $id = null): array
    {
        if ($id !== null) {
            $this->options->get($id);
        }
        $name = self::texte($data, 'name');
        if ($name === '') {
            throw new DomainError('Le nom de l\'option est obligatoire.');
        }
        $duration = self::entier($data, 'durationMin');
        if ($duration < 0) {
            throw new DomainError('La durée d\'une option ne peut pas être négative.');
        }
        $option = new Option($id ?? $this->ids->generate(), $name, Money::cents(self::entier($data, 'priceCents')), $duration, ($data['active'] ?? true) === true, self::texte($data, 'description', ''));
        $this->options->save($option);

        return self::optionEnTableau($option);
    }

    /** @return array<string, mixed> */
    private static function prestationEnTableau(Prestation $p): array
    {
        $tarifs = [];
        foreach ($p->tarifs() as $variante => $tarif) {
            $tarifs[$variante] = ['priceCents' => $tarif->price->cents, 'durationMin' => $tarif->durationMin];
        }

        return [
            'id' => $p->id(), 'name' => $p->name(), 'description' => $p->description(),
            'basePriceCents' => $p->basePrice()->cents, 'baseDurationMin' => $p->baseDurationMin(),
            'active' => $p->isActive(), 'categoryId' => $p->categoryId(), 'position' => $p->position(),
            'occupePlage' => $p->occupePlage(), 'tarifs' => $tarifs, 'optionIds' => $p->optionIds(),
        ];
    }

    /** @return array<string, mixed> */
    private static function optionEnTableau(Option $o): array
    {
        return ['id' => $o->id, 'name' => $o->name, 'description' => $o->description, 'priceCents' => $o->price->cents, 'durationMin' => $o->durationMin, 'active' => $o->active];
    }

    /** @param array<mixed> $data */
    private static function texte(array $data, string $key, ?string $defaut = null): string
    {
        $value = $data[$key] ?? $defaut;
        if (!is_string($value)) {
            throw new DomainError(sprintf('« %s » est obligatoire.', $key));
        }

        return trim($value);
    }

    /** @param array<mixed> $data */
    private static function entier(array $data, string $key): int
    {
        $value = $data[$key] ?? null;
        if (!is_int($value) || $value < 0) {
            throw new DomainError(sprintf('« %s » doit être un nombre entier positif.', $key));
        }

        return $value;
    }
}
