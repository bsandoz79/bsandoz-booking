<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Infrastructure;

use Bsandoz\Core\Payment\Domain\Model\EvenementPaiement;
use Bsandoz\Core\Payment\Domain\Port\PaymentGateway;
use Bsandoz\Core\Payment\Domain\SignatureInvalide;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Stripe\Exception\ApiErrorException;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;

/**
 * Stripe Checkout (compte Stripe du client). Clés dans .env.local : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
 * Moyens de paiement gérés depuis le tableau de bord Stripe (carte, Apple Pay, Google Pay…).
 * La session expire au bout de 30 minutes (minimum imposé par Stripe) ; un paiement arrivé après la fin du blocage
 * est traité par ConfirmerPaiement (confirmation si le créneau est libre, sinon remboursement).
 */
final class StripeGateway implements PaymentGateway
{
    private const EXPIRATION = 1800;

    public function __construct(
        private string $secretKey,
        private string $webhookSecret,
    ) {
    }

    public function createCheckout(string $reservationId, Money $amount, string $description, string $customerEmail, string $successUrl, string $cancelUrl): array
    {
        try {
            $session = $this->client()->checkout->sessions->create([
                'mode' => 'payment',
                'line_items' => [[
                    'quantity' => 1,
                    'price_data' => ['currency' => 'eur', 'unit_amount' => $amount->cents, 'product_data' => ['name' => $description]],
                ]],
                'customer_email' => $customerEmail,
                'client_reference_id' => $reservationId,
                'metadata' => ['reservation_id' => $reservationId],
                'payment_intent_data' => ['metadata' => ['reservation_id' => $reservationId]],
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'expires_at' => time() + self::EXPIRATION,
                'locale' => 'fr',
            ]);
        } catch (ApiErrorException) {
            throw new DomainError('Le paiement en ligne est momentanément indisponible, merci de réessayer.');
        }

        if (!is_string($session->url)) {
            throw new DomainError('Le paiement en ligne est momentanément indisponible, merci de réessayer.');
        }

        return ['sessionId' => $session->id, 'url' => $session->url];
    }

    public function refund(string $sessionId, Money $amount): void
    {
        try {
            $paymentIntent = $this->client()->checkout->sessions->retrieve($sessionId)->payment_intent;
            $paymentIntentId = is_string($paymentIntent) ? $paymentIntent : $paymentIntent?->id;
            if ($paymentIntentId === null) {
                throw new DomainError('Ce paiement ne peut pas être remboursé : aucun encaissement trouvé chez Stripe.');
            }
            $this->client()->refunds->create(['payment_intent' => $paymentIntentId, 'amount' => $amount->cents]);
        } catch (ApiErrorException) {
            throw new DomainError('Le remboursement a été refusé par Stripe, merci de réessayer ou de le faire depuis le tableau de bord Stripe.');
        }
    }

    public function parseWebhook(string $payload, string $signatureHeader): EvenementPaiement
    {
        if ($this->webhookSecret === '') {
            throw new SignatureInvalide('Secret de webhook Stripe absent (STRIPE_WEBHOOK_SECRET).');
        }

        try {
            $event = Webhook::constructEvent($payload, $signatureHeader, $this->webhookSecret);
        } catch (SignatureVerificationException|\UnexpectedValueException) {
            throw new SignatureInvalide('Signature Stripe invalide.');
        }

        $object = $event->data->object ?? null;
        $sessionId = is_object($object) && isset($object->id) && is_string($object->id) ? $object->id : null;
        $paye = is_object($object) && ($object->payment_status ?? null) === 'paid';

        return new EvenementPaiement($event->id, $event->type, $sessionId, $paye);
    }

    private function client(): StripeClient
    {
        if ($this->secretKey === '') {
            throw new DomainError('Le paiement en ligne n\'est pas encore configuré.');
        }

        return new StripeClient($this->secretKey);
    }
}
