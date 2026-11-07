<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

/**
 * Consomme le jeton d'activation, vérifie la robustesse du mot de passe, hache et active.
 *
 * @todo Injecter UserRepository, TokenService, PasswordHasher, Notifier, Clock et implémenter.
 */
final class ActiverCompte
{
    public function __invoke(string $token, string $plainPassword): void
    {
        throw new \LogicException('À implémenter');
    }
}
