<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Infrastructure;

use Bsandoz\Core\Abonnement\Domain\Model\Periodicite;
use Bsandoz\Core\Abonnement\Domain\Port\PrestataireAbonnement;
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
 * Abonnements : Stripe Billing (session en mode « subscription », prélèvement automatique à chaque période).
 */
final class StripeGateway implements PaymentGateway, PrestataireAbonnement
{
    private const EXPIRATION = 1800;

    private string $secretKey;
    private string $webhookSecret;

    public function __construct(?string $secretKey, ?string $webhookSecret)
    {
        $this->secretKey = $secretKey ?? '';
        $this->webhookSecret = $webhookSecret ?? '';
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
                // Adresse préremplie si connue (Stripe refuse une adresse vide).
                ...($customerEmail !== '' ? ['customer_email' => $customerEmail] : []),
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
        if (!is_object($object)) {
            return new EvenementPaiement($event->id, $event->type, $sessionId, $paye);
        }

        return match ($event->type) {
            EvenementPaiement::SESSION_TERMINEE => new EvenementPaiement(
                $event->id, $event->type, $sessionId, $paye, self::texte($object->mode ?? null),
                self::texte($object->client_reference_id ?? null), self::identifiant($object->subscription ?? null),
            ),
            EvenementPaiement::PRELEVEMENT_PAYE, EvenementPaiement::PRELEVEMENT_REFUSE => self::prelevement($event->id, $event->type, $object),
            EvenementPaiement::ABONNEMENT_TERMINE => new EvenementPaiement(
                $event->id, $event->type, null, false, null, self::texte($object->metadata->abonnement_id ?? null), $sessionId,
            ),
            default => new EvenementPaiement($event->id, $event->type, $sessionId, $paye),
        };
    }

    /**
     * Facture d'abonnement (prélèvement) : souscription et métadonnées, à l'ancien emplacement (invoice.subscription)
     * comme au nouveau (invoice.parent.subscription_details), montant payé et période de la première ligne.
     */
    private static function prelevement(string $id, string $type, object $facture): EvenementPaiement
    {
        $details = $facture->parent->subscription_details ?? $facture->subscription_details ?? null;
        $souscription = self::identifiant($facture->subscription ?? null) ?? self::identifiant(is_object($details) ? ($details->subscription ?? null) : null);
        $abonnementId = is_object($details) ? self::texte($details->metadata->abonnement_id ?? null) : null;
        $ligne = $facture->lines->data[0] ?? null;
        $periode = is_object($ligne) ? ($ligne->period ?? null) : null;

        return new EvenementPaiement(
            $id, $type, null, $type === EvenementPaiement::PRELEVEMENT_PAYE, null, $abonnementId, $souscription,
            self::texte($facture->id ?? null), is_int($facture->amount_paid ?? null) ? $facture->amount_paid : null,
            is_object($periode) && is_int($periode->start ?? null) ? $periode->start : null,
            is_object($periode) && is_int($periode->end ?? null) ? $periode->end : null,
        );
    }

    private static function texte(mixed $valeur): ?string
    {
        return is_string($valeur) && $valeur !== '' ? $valeur : null;
    }

    /** Identifiant Stripe, que l'objet soit développé ou non. */
    private static function identifiant(mixed $valeur): ?string
    {
        return is_object($valeur) ? self::texte($valeur->id ?? null) : self::texte($valeur);
    }

    public function creerSouscription(string $abonnementId, string $libelle, Money $prix, Periodicite $periodicite, string $email, string $successUrl, string $cancelUrl): array
    {
        try {
            $session = $this->client()->checkout->sessions->create([
                'mode' => 'subscription',
                'line_items' => [[
                    'quantity' => 1,
                    'price_data' => ['currency' => 'eur', 'unit_amount' => $prix->cents, 'product_data' => ['name' => $libelle], 'recurring' => $periodicite->rythme()],
                ]],
                ...($email !== '' ? ['customer_email' => $email] : []),
                'client_reference_id' => $abonnementId,
                'subscription_data' => ['metadata' => ['abonnement_id' => $abonnementId]],
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'locale' => 'fr',
            ]);
        } catch (ApiErrorException) {
            throw new DomainError('L\'abonnement est momentanément indisponible, merci de réessayer.');
        }
        if (!is_string($session->url)) {
            throw new DomainError('L\'abonnement est momentanément indisponible, merci de réessayer.');
        }

        return ['sessionId' => $session->id, 'url' => $session->url];
    }

    public function resilierEnFinDePeriode(string $fournisseurId): void
    {
        try {
            $this->client()->subscriptions->update($fournisseurId, ['cancel_at_period_end' => true]);
        } catch (ApiErrorException) {
            throw new DomainError('La résiliation a été refusée par Stripe, merci de réessayer.');
        }
    }

    private function client(): StripeClient
    {
        if ($this->secretKey === '') {
            throw new DomainError('Le paiement en ligne n\'est pas encore configuré.');
        }

        return new StripeClient($this->secretKey);
    }
}
