<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Application;

/**
 * Crée la session Stripe de l'acompte et l'enregistre (Payment).
 *
 * @todo Injecter PaymentGateway, ReservationRepository, Notifier et implémenter.
 */
final class CreerSessionAcompte
{
    public function __invoke(string $reservationId): string
    {
        throw new \LogicException('À implémenter');
    }
}
