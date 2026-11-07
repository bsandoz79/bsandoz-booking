<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Domain\Port;

use Bsandoz\Core\Auth\Domain\Model\TokenType;

/** Jetons à usage unique : 32 octets aléatoires, seul le hachage est stocké. */
interface TokenService
{
    /** Crée un jeton et renvoie sa valeur en clair (à mettre dans le lien du mail). */
    public function issue(string $subjectId, TokenType $type, \DateInterval $ttl): string;

    /** Vérifie et consomme le jeton ; renvoie l'id du sujet ou null. */
    public function consume(string $plainToken, TokenType $type): ?string;
}
