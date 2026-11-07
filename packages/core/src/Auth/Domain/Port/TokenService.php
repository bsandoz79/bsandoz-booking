<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Domain\Port;

use Bsandoz\Core\Auth\Domain\Model\TokenType;

/** Jetons aléatoires (liens envoyés par mail, sessions) : 32 octets, seul le hachage est stocké. */
interface TokenService
{
    /**
     * Crée un jeton et renvoie sa valeur en clair.
     *
     * @param bool $replacePrevious invalide les jetons encore valides du même sujet et du même type (seul le dernier lien
     *                              fonctionne) ; false pour les sessions, qui coexistent sur plusieurs appareils
     */
    public function issue(string $subjectId, TokenType $type, \DateInterval $ttl, bool $replacePrevious = true): string;

    /** Vérifie et consomme un jeton à usage unique ; renvoie l'id du sujet ou null. */
    public function consume(string $plainToken, TokenType $type): ?string;

    /** Vérifie un jeton réutilisable (gestion d'une réservation) sans le consommer ; renvoie l'id du sujet ou null. */
    public function verify(string $plainToken, TokenType $type): ?string;

    /** Invalide tous les jetons encore valides d'un sujet pour ces types (ex. toutes les sessions après un nouveau mot de passe). */
    public function revokeAll(string $subjectId, TokenType ...$types): void;
}
