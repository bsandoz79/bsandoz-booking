<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Payment\Domain\Model\EvenementPaiement;
use Bsandoz\Core\Payment\Domain\Port\PaymentGateway;
use Bsandoz\Core\Payment\Domain\SignatureInvalide;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Faux prestataire de paiement : sessions « cs_test_<n> », remboursements enregistrés.
 * Notification : JSON {"id", "type", "session", "paid"} et signature « valide ».
 */
final class FakePaymentGateway implements PaymentGateway
{
    public const SIGNATURE = 'valide';

    /** @var list<array{reservationId: string, amount: int, description: string, email: string, successUrl: string, cancelUrl: string}> */
    public array $checkouts = [];

    /** @var list<array{sessionId: string, amount: int}> */
    public array $refunds = [];

    public function createCheckout(string $reservationId, Money $amount, string $description, string $customerEmail, string $successUrl, string $cancelUrl): array
    {
        $this->checkouts[] = ['reservationId' => $reservationId, 'amount' => $amount->cents, 'description' => $description, 'email' => $customerEmail, 'successUrl' => $successUrl, 'cancelUrl' => $cancelUrl];
        $sessionId = sprintf('cs_test_%d', count($this->checkouts));

        return ['sessionId' => $sessionId, 'url' => 'https://paiement.test/' . $sessionId];
    }

    public function refund(string $sessionId, Money $amount): void
    {
        $this->refunds[] = ['sessionId' => $sessionId, 'amount' => $amount->cents];
    }

    public function parseWebhook(string $payload, string $signatureHeader): EvenementPaiement
    {
        if ($signatureHeader !== self::SIGNATURE) {
            throw new SignatureInvalide('Signature invalide.');
        }
        $data = json_decode($payload, true);
        if (!is_array($data) || !is_string($data['id'] ?? null) || !is_string($data['type'] ?? null)) {
            throw new SignatureInvalide('Notification illisible.');
        }

        return new EvenementPaiement($data['id'], $data['type'], is_string($data['session'] ?? null) ? $data['session'] : null, ($data['paid'] ?? false) === true);
    }

    /** Notification « session réglée » prête à envoyer. */
    public static function sessionReglee(string $sessionId, string $eventId = 'evt_1'): string
    {
        return json_encode(['id' => $eventId, 'type' => EvenementPaiement::SESSION_TERMINEE, 'session' => $sessionId, 'paid' => true], JSON_THROW_ON_ERROR);
    }
}
