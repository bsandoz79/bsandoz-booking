<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

/** Session ouverte : compte connecté et jeton de renouvellement (à mettre dans un cookie httpOnly). */
final class Session
{
    public const TTL = 'P30D';

    /** @param list<string> $roles */
    public function __construct(
        public readonly string $userId,
        public readonly array $roles,
        public readonly string $refreshToken,
    ) {
    }
}
