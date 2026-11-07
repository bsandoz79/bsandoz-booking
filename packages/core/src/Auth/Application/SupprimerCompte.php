<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

/**
 * RGPD : anonymise le compte, garde les données de facturation légales.
 *
 * @todo Injecter UserRepository, TokenService, PasswordHasher, Notifier, Clock et implémenter.
 */
final class SupprimerCompte
{
    public function __invoke(string $userId): void
    {
        throw new \LogicException('À implémenter');
    }
}
