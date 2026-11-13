<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Une prestation vendue (ex. « Nettoyage intérieur »), avec ses tarifs par variante métier
 * et la liste des options autorisées (par identifiant, les options vivant à part).
 * Durée incertaine ($occupePlage) : la prestation occupe toute la plage d'ouverture (demi-journée) où elle commence.
 */
class Prestation
{
    /** @var array<string, Tarif> tarifs indexés par variante */
    private array $tarifs = [];

    /** @var list<string> identifiants des options autorisées */
    private array $optionIds = [];

    public function __construct(
        private string $id,
        private string $name,
        private Money $basePrice,
        private int $baseDurationMin,
        private string $description = '',
        private bool $active = true,
        private ?string $categoryId = null,
        private int $position = 0,
        private bool $occupePlage = false,
        /** Mise en avant affichée sur la formule (ex. « Le plus choisi ») ; null : aucune. */
        private ?string $badge = null,
        /** Remise par unité au-delà de la première (ex. 5 € de moins par véhicule supplémentaire), en centimes. */
        private int $remiseUniteSupplementaire = 0,
    ) {
    }

    public function id(): string { return $this->id; }
    public function name(): string { return $this->name; }
    public function description(): string { return $this->description; }
    public function basePrice(): Money { return $this->basePrice; }
    public function baseDurationMin(): int { return $this->baseDurationMin; }
    public function isActive(): bool { return $this->active; }
    public function categoryId(): ?string { return $this->categoryId; }
    public function position(): int { return $this->position; }
    /** Vrai si la durée est incertaine : la prestation bloque toute la demi-journée. */
    public function occupePlage(): bool { return $this->occupePlage; }
    public function badge(): ?string { return $this->badge; }
    public function remiseUniteSupplementaire(): Money { return Money::cents($this->remiseUniteSupplementaire); }

    /** Remise par unité supplémentaire (0 : aucune). @throws DomainError négative */
    public function changerRemiseUniteSupplementaire(int $cents): void
    {
        if ($cents < 0) {
            throw new DomainError('La remise par unité supplémentaire ne peut pas être négative.');
        }
        $this->remiseUniteSupplementaire = $cents;
    }

    /** Nouvelle place dans l'ordre d'affichage (glisser-déposer de l'espace pro). */
    public function changerPosition(int $position): void
    {
        $this->position = max(0, $position);
    }

    /** Mise en avant (ex. « Le plus choisi ») : texte court, vide pour l'enlever. @throws DomainError trop long */
    public function changerBadge(?string $badge): void
    {
        $badge = $badge === null ? '' : trim($badge);
        if (mb_strlen($badge) > 40) {
            throw new DomainError('La mise en avant est limitée à 40 caractères.');
        }
        $this->badge = $badge === '' ? null : $badge;
    }

    /** Modification depuis l'espace pro. @throws DomainError nom vide ou durée nulle */
    public function modifier(
        string $name,
        string $description,
        Money $basePrice,
        int $baseDurationMin,
        bool $active,
        ?string $categoryId,
        int $position,
        bool $occupePlage,
    ): void {
        if (trim($name) === '') {
            throw new DomainError('Le nom de la prestation est obligatoire.');
        }
        if ($baseDurationMin < 1) {
            throw new DomainError('La durée de la prestation doit être d\'au moins une minute.');
        }
        $this->name = trim($name);
        $this->description = $description;
        $this->basePrice = $basePrice;
        $this->baseDurationMin = $baseDurationMin;
        $this->active = $active;
        $this->categoryId = $categoryId;
        $this->position = $position;
        $this->occupePlage = $occupePlage;
    }

    /** @param list<Tarif> $tarifs remplace tous les tarifs par variante */
    public function remplacerTarifs(array $tarifs): void
    {
        $this->tarifs = [];
        foreach ($tarifs as $tarif) {
            if ($tarif->durationMin < 1) {
                throw new DomainError(sprintf('La durée du tarif « %s » doit être d\'au moins une minute.', $tarif->variante));
            }
            $this->addTarif($tarif);
        }
    }

    /** @param list<string> $optionIds remplace les options autorisées */
    public function remplacerOptions(array $optionIds): void
    {
        $this->optionIds = array_values(array_unique($optionIds));
    }

    public function addTarif(Tarif $tarif): void
    {
        $this->tarifs[$tarif->variante] = $tarif;
    }

    /** @return array<string, Tarif> */
    public function tarifs(): array
    {
        return $this->tarifs;
    }

    public function addOption(Option $option): void
    {
        if (!$this->allowsOption($option->id)) {
            $this->optionIds[] = $option->id;
        }
    }

    /** @return list<string> */
    public function optionIds(): array
    {
        return $this->optionIds;
    }

    public function priceFor(?string $variante): Money
    {
        return $variante !== null && isset($this->tarifs[$variante]) ? $this->tarifs[$variante]->price : $this->basePrice;
    }

    public function durationFor(?string $variante): int
    {
        return $variante !== null && isset($this->tarifs[$variante]) ? $this->tarifs[$variante]->durationMin : $this->baseDurationMin;
    }

    public function allowsOption(string $optionId): bool
    {
        return in_array($optionId, $this->optionIds, true);
    }
}
