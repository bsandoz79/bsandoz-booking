<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;

/**
 * Compte du client à la réservation : renvoie l'id du compte existant si l'e-mail est connu
 * (sans connexion automatique ni modification de ses données), sinon crée un compte « pending » sans mot de passe.
 * Le lien d'activation (jeton 7 jours + mail) sera envoyé à partir de feature/core-auth.
 */
final class CreerCompteDepuisReservation
{
    public function __construct(
        private UserRepository $users,
        private IdGenerator $ids,
        private Clock $clock,
    ) {
    }

    /** @throws DomainError e-mail invalide ou nom manquant */
    public function __invoke(string $email, string $firstname, string $lastname, string $phone): string
    {
        $email = mb_strtolower(trim($email));
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new DomainError('Adresse e-mail invalide.');
        }
        if (trim($firstname) === '' || trim($lastname) === '') {
            throw new DomainError('Le prénom et le nom sont obligatoires.');
        }

        $existing = $this->users->findByEmail($email);
        if ($existing !== null) {
            return $existing->id();
        }

        $user = new User($this->ids->generate(), $email, trim($firstname), trim($lastname), trim($phone), ['ROLE_CLIENT'], $this->clock->now());
        $this->users->save($user);

        return $user->id();
    }
}
