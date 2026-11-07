<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

/**
 * Renvoie l'id du compte : existant si l'e-mail est connu (sans connexion automatique), sinon nouveau compte pending + jeton d'activation 7 jours.
 *
 * @todo Injecter UserRepository, TokenService, PasswordHasher, Notifier, Clock et implémenter.
 */
final class CreerCompteDepuisReservation
{
    public function __invoke(string $email, string $firstname, string $lastname, string $phone): string
    {
        throw new \LogicException('À implémenter');
    }
}
