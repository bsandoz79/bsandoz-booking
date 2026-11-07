<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\TokenService;

/** Déconnexion de cet appareil : le jeton de session est invalidé (sans erreur s'il l'était déjà). */
final class SeDeconnecter
{
    public function __construct(private TokenService $tokens)
    {
    }

    public function __invoke(?string $refreshToken): void
    {
        if ($refreshToken !== null && $refreshToken !== '') {
            $this->tokens->consume($refreshToken, TokenType::Refresh);
        }
    }
}
