<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Model;

/** Abonnement Web Push d'un appareil (navigateur ou application installée) du pro. Pas « final » : Doctrine génère un proxy (lazy ghost) pour chaque entité. */
class AbonnementPush
{
    public function __construct(
        public readonly string $id,
        public readonly string $userId,
        /** Adresse du service push du navigateur (unique par appareil). */
        public readonly string $endpoint,
        /** Clé publique de l'appareil (p256dh, base64url) et secret d'authentification (auth). */
        public readonly string $publicKey,
        public readonly string $authToken,
        public readonly \DateTimeImmutable $createdAt,
    ) {
    }
}
