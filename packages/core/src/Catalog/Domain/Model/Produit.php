<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Produit vendu avec une réservation (proposé juste avant le paiement), payé en entier en ligne avec l'acompte et remis
 * au client le jour du rendez-vous. Le stock est tenu par le pro : à 0, le produit n'est plus proposé.
 * Pas « final » : Doctrine génère un proxy (lazy ghost) pour chaque entité.
 */
class Produit
{
    public const QUANTITE_MAX = 10;

    public function __construct(
        private string $id,
        private string $nom,
        private Money $prix,
        private int $stock = 0,
        private string $description = '',
        private bool $actif = true,
        private int $position = 0,
        private ?string $photo = null,
    ) {
        self::valider($nom, $prix, $stock);
    }

    public function id(): string { return $this->id; }
    public function nom(): string { return $this->nom; }
    public function prix(): Money { return $this->prix; }
    public function stock(): int { return $this->stock; }
    public function description(): string { return $this->description; }
    public function actif(): bool { return $this->actif; }
    public function position(): int { return $this->position; }
    public function photo(): ?string { return $this->photo; }

    /** Proposé aux clients : actif et en stock. */
    public function enVente(): bool
    {
        return $this->actif && $this->stock > 0;
    }

    /** @throws DomainError */
    public function modifier(string $nom, string $description, Money $prix, int $stock, bool $actif, int $position, ?string $photo): void
    {
        self::valider($nom, $prix, $stock);
        $this->nom = $nom;
        $this->description = $description;
        $this->prix = $prix;
        $this->stock = $stock;
        $this->actif = $actif;
        $this->position = $position;
        $this->photo = $photo;
    }

    /** @throws DomainError produit retiré, quantité invalide ou stock insuffisant */
    public function retirerDuStock(int $quantite): void
    {
        if ($quantite < 1 || $quantite > self::QUANTITE_MAX) {
            throw new DomainError(sprintf('Quantité invalide pour « %s » (de 1 à %d).', $this->nom, self::QUANTITE_MAX));
        }
        if (!$this->actif) {
            throw new DomainError(sprintf('« %s » n\'est plus proposé.', $this->nom));
        }
        if ($quantite > $this->stock) {
            throw new DomainError($this->stock === 0
                ? sprintf('« %s » n\'est plus en stock.', $this->nom)
                : sprintf('Il ne reste que %d « %s » en stock.', $this->stock, $this->nom));
        }
        $this->stock -= $quantite;
    }

    /** Réservation annulée ou non payée : les produits reviennent en stock. */
    public function remettreEnStock(int $quantite): void
    {
        $this->stock += max(0, $quantite);
    }

    /** Vente déjà payée (paiement arrivé après l'expiration) : retire sans contrôle, sans descendre sous 0. */
    public function reprendre(int $quantite): void
    {
        $this->stock = max(0, $this->stock - max(0, $quantite));
    }

    /** @throws DomainError */
    private static function valider(string $nom, Money $prix, int $stock): void
    {
        if (trim($nom) === '') {
            throw new DomainError('Le nom du produit est obligatoire.');
        }
        if ($prix->cents <= 0) {
            throw new DomainError('Le prix du produit doit être supérieur à 0.');
        }
        if ($stock < 0) {
            throw new DomainError('Le stock ne peut pas être négatif.');
        }
    }
}
