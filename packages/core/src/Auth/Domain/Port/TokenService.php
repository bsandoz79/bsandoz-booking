<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Domain\Port;

use Bsandoz\Core\Auth\Domain\Model\TokenType;

/** Jetons envoyés par mail : 32 octets aléatoires, seul le hachage est stocké. */
interface TokenService
{
    /**
     * Crée un jeton et renvoie sa valeur en clair (à mettre dans le lien du mail).
     * Les jetons encore valides du même sujet et du même type sont invalidés : seul le dernier lien fonctionne.
     */
    public function issue(string $subjectId, TokenType $type, \DateInterval $ttl): string;

    /** Vérifie et consomme un jeton à usage unique ; renvoie l'id du sujet ou null. */
    public function consume(string $plainToken, TokenType $type): ?string;

    /** Vérifie un jeton réutilisable (gestion d'une réservation) sans le consommer ; renvoie l'id du sujet ou null. */
    public function verify(string $plainToken, TokenType $type): ?string;
}
