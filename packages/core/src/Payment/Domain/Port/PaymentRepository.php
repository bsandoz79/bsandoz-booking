<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Domain\Port;

use Bsandoz\Core\Payment\Domain\Model\Payment;

interface PaymentRepository
{
    public function save(Payment $payment): void;

    public function bySessionId(string $sessionId): ?Payment;

    /** Paiement encaissé de la réservation (le plus récent), s'il y en a un. */
    public function paidForReservation(string $reservationId): ?Payment;
}
