<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Avoir d'un client : somme déjà payée et non remboursée (ex. annulation tardive d'un rendez-vous réglé en ligne),
 * déduite automatiquement de ses prochaines réservations.
 */
class Avoir
{
    private int $soldeCents = 0;

    public function __construct(
        private string $userId,
        private \DateTimeImmutable $updatedAt,
    ) {
    }

    public function userId(): string { return $this->userId; }
    public function solde(): Money { return Money::cents($this->soldeCents); }
    public function updatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    public function crediter(Money $montant, \DateTimeImmutable $now): void
    {
        if ($montant->cents < 0) {
            throw new DomainError('Un avoir ne peut pas être crédité d\'un montant négatif.');
        }
        $this->soldeCents += $montant->cents;
        $this->updatedAt = $now;
    }

    /** Retire jusqu'à $max du solde (sans descendre sous zéro) et renvoie le montant retiré. */
    public function debiter(Money $max, \DateTimeImmutable $now): Money
    {
        $retire = min($this->soldeCents, max(0, $max->cents));
        $this->soldeCents -= $retire;
        $this->updatedAt = $now;

        return Money::cents($retire);
    }

    /** Correction par le pro. @throws DomainError négatif */
    public function definir(Money $solde, \DateTimeImmutable $now): void
    {
        if ($solde->cents < 0) {
            throw new DomainError('Un avoir ne peut pas être négatif.');
        }
        $this->soldeCents = $solde->cents;
        $this->updatedAt = $now;
    }
}
