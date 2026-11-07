<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Shared\Domain\Money;

/** Résultat de ReserverCreneau. */
final class ReservationCreee
{
    /**
     * @param ReservationStatus $status en attente de paiement (acompte à verser avant $holdExpiresAt) ou confirmée (sans acompte)
     */
    public function __construct(
        public readonly string $reservationId,
        public readonly ReservationStatus $status,
        public readonly Money $deposit,
        public readonly Money $total,
        public readonly ?\DateTimeImmutable $holdExpiresAt,
    ) {
    }
}
