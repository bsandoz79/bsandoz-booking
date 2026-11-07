<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

/**
 * Consomme le jeton reset, change le mot de passe, révoque les refresh tokens.
 *
 * @todo Injecter UserRepository, TokenService, PasswordHasher, Notifier, Clock et implémenter.
 */
final class ReinitialiserMotDePasse
{
    public function __invoke(string $token, string $plainPassword): void
    {
        throw new \LogicException('À implémenter');
    }
}
