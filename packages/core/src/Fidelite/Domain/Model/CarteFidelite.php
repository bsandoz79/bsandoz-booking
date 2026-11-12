<?php

declare(strict_types=1);

namespace Bsandoz\Core\Fidelite\Domain\Model;

/**
 * Carte de fidélité d'un client : un tampon par prestation réalisée. Quand la carte est pleine, la prochaine réservation
 * reçoit la remise et la carte repart (les tampons en trop sont gardés). Pas « final » : proxy Doctrine.
 */
class CarteFidelite
{
    public function __construct(
        private string $userId,
        private int $tampons,
        private \DateTimeImmutable $updatedAt,
    ) {
    }

    public static function vide(string $userId, \DateTimeImmutable $now): self
    {
        return new self($userId, 0, $now);
    }

    public function userId(): string { return $this->userId; }
    public function tampons(): int { return $this->tampons; }
    public function updatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    public function estPleine(RegleFidelite $regle): bool
    {
        return $regle->actif && $this->tampons >= $regle->tamponsRequis;
    }

    public function tamponner(\DateTimeImmutable $now): void
    {
        ++$this->tampons;
        $this->updatedAt = $now;
    }

    /** Ajout ou retrait à la main par le pro (carte papier perdue, prestation hors site…) ; jamais sous zéro. */
    public function ajuster(int $delta, \DateTimeImmutable $now): void
    {
        $this->tampons = max(0, $this->tampons + $delta);
        $this->updatedAt = $now;
    }

    /** La remise est utilisée : la carte repart. */
    public function utiliserRecompense(RegleFidelite $regle, \DateTimeImmutable $now): void
    {
        $this->tampons = max(0, $this->tampons - $regle->tamponsRequis);
        $this->updatedAt = $now;
    }

    /** Réservation remisée annulée ou jamais payée : la carte redevient pleine. */
    public function rendreRecompense(int $tamponsRequis, \DateTimeImmutable $now): void
    {
        $this->tampons += $tamponsRequis;
        $this->updatedAt = $now;
    }
}
