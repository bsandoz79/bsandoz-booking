<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Application;

/**
 * Webhook checkout.session.completed : idempotent, confirme la réservation, déclenche les mails.
 *
 * @todo Injecter PaymentGateway, ReservationRepository, Notifier et implémenter.
 */
final class ConfirmerPaiement
{
    public function __invoke(string $payload, string $signature): void
    {
        throw new \LogicException('À implémenter');
    }
}
