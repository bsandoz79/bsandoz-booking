<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Infrastructure;

use Bsandoz\Core\Payment\Domain\Port\PaymentGateway;
use Bsandoz\Core\Shared\Domain\Money;

/** Clés dans .env.local : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (compte Stripe du client). */
final class StripeGateway implements PaymentGateway
{
    public function __construct(private string $secretKey, private string $webhookSecret)
    {
    }

    /** @todo \Stripe\Checkout\Session::create (mode payment, payment_method_types auto → carte, Apple Pay, Google Pay). */
    public function createCheckout(string $reservationId, Money $amount, string $description, string $customerEmail, string $successUrl, string $cancelUrl): array { throw new \LogicException('À implémenter'); }

    /** @todo \Stripe\Refund::create sur le payment_intent de la session. */
    public function refund(string $sessionId, Money $amount): void { throw new \LogicException('À implémenter'); }

    /** @todo \Stripe\Webhook::constructEvent($payload, $signatureHeader, $this->webhookSecret). */
    public function parseWebhook(string $payload, string $signatureHeader): array { throw new \LogicException('À implémenter'); }
}
