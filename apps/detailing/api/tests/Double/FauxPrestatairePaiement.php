<?php

declare(strict_types=1);

namespace App\Tests\Double;

use Bsandoz\Core\Payment\Domain\Model\EvenementPaiement;
use Bsandoz\Core\Payment\Domain\Port\PaymentGateway;
use Bsandoz\Core\Payment\Domain\SignatureInvalide;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Faux Stripe pour les tests fonctionnels (branché dans config/services.yaml, environnement de test) :
 * sessions « cs_test_<aléatoire> », remboursements acceptés, notification JSON {"id", "type", "session", "paid"}
 * signée « valide ».
 */
final class FauxPrestatairePaiement implements PaymentGateway
{
    public const SIGNATURE = 'valide';

    public function createCheckout(string $reservationId, Money $amount, string $description, string $customerEmail, string $successUrl, string $cancelUrl): array
    {
        $sessionId = 'cs_test_' . bin2hex(random_bytes(6));

        return ['sessionId' => $sessionId, 'url' => 'https://paiement.test/' . $sessionId];
    }

    public function refund(string $sessionId, Money $amount): void
    {
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
}
