<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Domain\Port;

use Bsandoz\Core\Shared\Domain\Money;

/** Prestataire de paiement (Stripe en V1). */
interface PaymentGateway
{
    /** Crée une session de paiement et renvoie [id de session, URL de paiement]. */
    public function createCheckout(string $reservationId, Money $amount, string $description, string $customerEmail, string $successUrl, string $cancelUrl): array;

    public function refund(string $sessionId, Money $amount): void;

    /** Vérifie la signature et renvoie l'événement décodé, ou lève une exception. */
    public function parseWebhook(string $payload, string $signatureHeader): array;
}
