<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Application;

/**
 * Remboursement total ou partiel depuis l'espace pro ou une annulation gratuite.
 *
 * @todo Injecter PaymentGateway, ReservationRepository, Notifier et implémenter.
 */
final class RembourserAcompte
{
    public function __invoke(string $reservationId, ?int $amountCents = null): void
    {
        throw new \LogicException('À implémenter');
    }
}
