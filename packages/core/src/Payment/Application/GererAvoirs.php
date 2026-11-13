<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Application;

use Bsandoz\Core\Payment\Domain\Model\Avoir;
use Bsandoz\Core\Payment\Domain\Port\Avoirs;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Avoirs des clients : crédités quand une somme payée n'est pas remboursée (annulation tardive), utilisés
 * automatiquement à la réservation suivante, rendus si cette réservation est annulée ou expire.
 */
final class GererAvoirs
{
    public function __construct(
        private Avoirs $avoirs,
        private Clock $clock,
    ) {
    }

    public function solde(string $userId): Money
    {
        return $this->avoirs->get($userId)?->solde() ?? Money::zero();
    }

    public function crediter(string $userId, Money $montant): void
    {
        if ($montant->cents <= 0) {
            return;
        }
        $avoir = $this->avoirOuNouveau($userId);
        $avoir->crediter($montant, $this->clock->now());
        $this->avoirs->save($avoir);
    }

    /** @return Money montant déduit (au plus $max, au plus le solde) */
    public function utiliser(string $userId, Money $max): Money
    {
        $avoir = $this->avoirs->get($userId);
        if ($avoir === null || $avoir->solde()->cents === 0 || $max->cents <= 0) {
            return Money::zero();
        }
        $retire = $avoir->debiter($max, $this->clock->now());
        $this->avoirs->save($avoir);

        return $retire;
    }

    /** Correction par le pro. */
    public function definir(string $userId, Money $solde): Money
    {
        $avoir = $this->avoirOuNouveau($userId);
        $avoir->definir($solde, $this->clock->now());
        $this->avoirs->save($avoir);

        return $avoir->solde();
    }

    private function avoirOuNouveau(string $userId): Avoir
    {
        return $this->avoirs->get($userId) ?? new Avoir($userId, $this->clock->now());
    }
}
