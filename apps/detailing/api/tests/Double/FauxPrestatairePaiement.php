<?php

declare(strict_types=1);

namespace App\Tests\Double;

use Bsandoz\Core\Abonnement\Domain\Model\Periodicite;
use Bsandoz\Core\Abonnement\Domain\Port\PrestataireAbonnement;
use Bsandoz\Core\Payment\Domain\Model\EvenementPaiement;
use Bsandoz\Core\Payment\Domain\Port\PaymentGateway;
use Bsandoz\Core\Payment\Domain\SignatureInvalide;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Faux Stripe pour les tests fonctionnels (branché dans config/services.yaml, environnement de test) :
 * sessions « cs_test_<aléatoire> », remboursements acceptés, notification JSON signée « valide » :
 * {"id", "type", "session", "paid", "mode"?, "abonnement"?, "souscription"?, "facture"?, "montant"?, "debut"?, "fin"?}.
 * Abonnements : souscriptions acceptées, résiliations notées.
 */
final class FauxPrestatairePaiement implements PaymentGateway, PrestataireAbonnement
{
    public const SIGNATURE = 'valide';

    /** @var list<string> souscriptions résiliées en fin de période */
    public array $resiliations = [];

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
        $texte = static fn (string $cle): ?string => is_string($data[$cle] ?? null) ? $data[$cle] : null;
        $entier = static fn (string $cle): ?int => is_int($data[$cle] ?? null) ? $data[$cle] : null;

        return new EvenementPaiement(
            $data['id'], $data['type'], $texte('session'), ($data['paid'] ?? false) === true, $texte('mode'),
            $texte('abonnement'), $texte('souscription'), $texte('facture'), $entier('montant'), $entier('debut'), $entier('fin'),
        );
    }

    public function creerSouscription(string $abonnementId, string $libelle, Money $prix, Periodicite $periodicite, string $email, string $successUrl, string $cancelUrl): array
    {
        $sessionId = 'cs_abo_' . bin2hex(random_bytes(6));

        return ['sessionId' => $sessionId, 'url' => 'https://paiement.test/' . $sessionId];
    }

    public function resilierEnFinDePeriode(string $fournisseurId): void
    {
        $this->resiliations[] = $fournisseurId;
    }
}
