<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Domain\Port;

use Bsandoz\Core\Payment\Domain\Model\EvenementPaiement;
use Bsandoz\Core\Payment\Domain\SignatureInvalide;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/** Prestataire de paiement (Stripe en V1). */
interface PaymentGateway
{
    /**
     * Crée une session de paiement.
     *
     * @return array{sessionId: string, url: string} identifiant de session et URL de paiement
     * @throws DomainError paiement en ligne non configuré ou indisponible
     */
    public function createCheckout(string $reservationId, Money $amount, string $description, string $customerEmail, string $successUrl, string $cancelUrl): array;

    /** @throws DomainError remboursement refusé par le prestataire */
    public function refund(string $sessionId, Money $amount): void;

    /**
     * Vérifie la signature et renvoie la notification décodée.
     *
     * @throws SignatureInvalide
     */
    public function parseWebhook(string $payload, string $signatureHeader): EvenementPaiement;
}
