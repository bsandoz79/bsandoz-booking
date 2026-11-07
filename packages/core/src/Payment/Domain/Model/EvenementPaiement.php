<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Domain\Model;

/** Notification du prestataire de paiement (webhook), après vérification de sa signature. */
final class EvenementPaiement
{
    public const SESSION_TERMINEE = 'checkout.session.completed';

    public function __construct(
        public readonly string $id,
        public readonly string $type,
        public readonly ?string $sessionId,
        public readonly bool $paye,
    ) {
    }

    /** Session de paiement réglée : la seule notification qui confirme une réservation. */
    public function confirmeUnPaiement(): bool
    {
        return $this->type === self::SESSION_TERMINEE && $this->paye && $this->sessionId !== null;
    }
}
