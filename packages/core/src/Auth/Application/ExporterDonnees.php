<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

/**
 * RGPD : export JSON des données du client.
 *
 * @todo Injecter UserRepository, TokenService, PasswordHasher, Notifier, Clock et implémenter.
 */
final class ExporterDonnees
{
    public function __invoke(string $userId): array
    {
        throw new \LogicException('À implémenter');
    }
}
