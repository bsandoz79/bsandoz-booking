<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Application;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Model\Produit;
use Bsandoz\Core\Catalog\Domain\Model\Tarif;
use Bsandoz\Core\Catalog\Domain\Port\OptionRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Catalog\Domain\Port\ProduitRepository;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Catalogue dans l'espace pro : prestations (tarifs par variante, options autorisées, durée incertaine) et options.
 * Rien n'est supprimé (les réservations passées y font référence) : on désactive.
 *
 * Prestation : {"name", "description", "basePriceCents", "baseDurationMin", "active", "categoryId", "position",
 *               "occupePlage", "badge" (mise en avant, ex. « Le plus choisi »),
 *               "remiseUniteCents" (remise par unité au-delà de la première, défaut 0), "tarifs": {"<variante>": {"priceCents", "durationMin"}}, "optionIds": []}
 * Option     : {"name", "description", "priceCents", "durationMin", "active"}
 * Produit    : {"name", "description", "priceCents", "stock", "active", "position", "photo", "category"} (vendu avec une réservation)
 */
final class GererCatalogue
{
    public function __construct(
        private PrestationRepository $prestations,
        private OptionRepository $options,
        private IdGenerator $ids,
        private ?ProduitRepository $produits = null,
    ) {
    }

    /** @return array{prestations: list<array<string, mixed>>, options: list<array<string, mixed>>, produits: list<array<string, mixed>>} */
    public function lister(): array
    {
        return [
            'prestations' => array_map(self::prestationEnTableau(...), $this->prestations->all()),
            'options' => array_map(self::optionEnTableau(...), $this->options->all()),
            'produits' => array_map(self::produitEnTableau(...), $this->produits?->all() ?? []),
        ];
    }

    /**
     * Crée (sans identifiant) ou modifie un produit : nom, prix, stock, photo… Stock à 0 ou produit inactif : plus proposé.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     * @throws DomainError données invalides
     * @throws NotFound produit inconnu
     */
    public function enregistrerProduit(array $data, ?string $id = null): array
    {
        $depot = $this->depotProduits();
        $nom = self::texte($data, 'name');
        $prix = Money::cents(self::entier($data, 'priceCents'));
        $stock = self::entier($data, 'stock');
        $photo = $data['photo'] ?? null;
        $photo = is_string($photo) && trim($photo) !== '' ? trim($photo) : null;
        $position = is_int($data['position'] ?? null) ? $data['position'] : 0;
        $actif = ($data['active'] ?? true) === true;
        $description = self::texte($data, 'description', '');
        $categorie = $data['category'] ?? null;
        $categorie = is_string($categorie) ? $categorie : null;

        if ($id === null) {
            $produit = new Produit($this->ids->generate(), $nom, $prix, $stock, $description, $actif, $position, $photo, $categorie);
        } else {
            $produit = $depot->get($id);
            $produit->modifier($nom, $description, $prix, $stock, $actif, $position, $photo, $categorie);
        }
        $depot->save($produit);

        return self::produitEnTableau($produit);
    }

    /** Retire un produit de la vente (gardé pour l'historique des réservations). @throws NotFound */
    public function retirerProduit(string $id): void
    {
        $depot = $this->depotProduits();
        $p = $depot->get($id);
        $p->modifier($p->nom(), $p->description(), $p->prix(), $p->stock(), false, $p->position(), $p->photo(), $p->categorie());
        $depot->save($p);
    }

    /** Supprime définitivement un produit (les réservations passées gardent son nom et son prix). @throws NotFound */
    public function supprimerProduit(string $id): void
    {
        $depot = $this->depotProduits();
        $depot->remove($depot->get($id));
    }

    private function depotProduits(): ProduitRepository
    {
        return $this->produits ?? throw new DomainError('La vente de produits n\'est pas disponible.');
    }

    /** @return array<string, mixed> */
    private static function produitEnTableau(Produit $p): array
    {
        return [
            'id' => $p->id(), 'name' => $p->nom(), 'description' => $p->description(), 'priceCents' => $p->prix()->cents,
            'stock' => $p->stock(), 'active' => $p->actif(), 'position' => $p->position(), 'photo' => $p->photo(),
            'category' => $p->categorie(),
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
        $badge = $data['badge'] ?? null;
        $prestation->changerBadge(is_string($badge) ? $badge : null);
        $remise = $data['remiseUniteCents'] ?? 0;
        if (!is_int($remise)) {
            throw new DomainError('« remiseUniteCents » doit être un nombre entier de centimes.');
        }
        $prestation->changerRemiseUniteSupplementaire($remise);

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
        // Position : celle demandée, sinon celle de l'option existante, sinon à la fin.
        $position = is_int($data['position'] ?? null) ? $data['position'] : ($id !== null ? $this->options->get($id)->position : count($this->options->all()));
        $option = new Option($id ?? $this->ids->generate(), $name, Money::cents(self::entier($data, 'priceCents')), $duration, ($data['active'] ?? true) === true, self::texte($data, 'description', ''), $position);
        $this->options->save($option);

        return self::optionEnTableau($option);
    }

    /**
     * Nouvel ordre d'affichage (glisser-déposer) : identifiants dans l'ordre voulu ; positions 0, 1, 2…
     * Les éléments absents de la liste gardent leur place.
     *
     * @param array<string, mixed> $data {prestations?: list<string>, options?: list<string>, produits?: list<string>}
     * @throws NotFound identifiant inconnu
     * @throws DomainError liste invalide
     */
    public function reordonner(array $data): void
    {
        $liste = static function (string $cle) use ($data): array {
            $ids = $data[$cle] ?? [];
            if (!is_array($ids) || !array_is_list($ids) || array_filter($ids, static fn (mixed $id): bool => !is_string($id)) !== []) {
                throw new DomainError(sprintf('« %s » : liste d\'identifiants attendue.', $cle));
            }
            /** @var list<string> $ids */
            return $ids;
        };
        foreach ($liste('prestations') as $position => $id) {
            $p = $this->prestations->get($id);
            $p->changerPosition($position);
            $this->prestations->save($p);
        }
        foreach ($liste('options') as $position => $id) {
            $o = $this->options->get($id);
            $this->options->save(new Option($o->id, $o->name, $o->price, $o->durationMin, $o->active, $o->description, $position));
        }
        foreach ($liste('produits') as $position => $id) {
            $depot = $this->depotProduits();
            $p = $depot->get($id);
            $p->modifier($p->nom(), $p->description(), $p->prix(), $p->stock(), $p->actif(), $position, $p->photo(), $p->categorie());
            $depot->save($p);
        }
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
            'occupePlage' => $p->occupePlage(), 'badge' => $p->badge(), 'remiseUniteCents' => $p->remiseUniteSupplementaire()->cents, 'tarifs' => $tarifs, 'optionIds' => $p->optionIds(),
        ];
    }

    /** @return array<string, mixed> */
    private static function optionEnTableau(Option $o): array
    {
        return ['id' => $o->id, 'name' => $o->name, 'description' => $o->description, 'priceCents' => $o->price->cents, 'durationMin' => $o->durationMin, 'active' => $o->active, 'position' => $o->position];
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
