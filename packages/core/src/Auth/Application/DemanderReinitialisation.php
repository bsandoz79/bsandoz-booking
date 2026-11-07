<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

/**
 * Mot de passe oublié ou changement depuis l'espace client : mail avec lien 1 h. Même réponse que l'e-mail existe ou non.
 *
 * @todo Injecter UserRepository, TokenService, PasswordHasher, Notifier, Clock et implémenter.
 */
final class DemanderReinitialisation
{
    public function __invoke(string $email): void
    {
        throw new \LogicException('À implémenter');
    }
}
