<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Notification\Domain\Port\Notifier;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;

/**
 * Compte du client à la réservation : renvoie l'id du compte existant si l'e-mail est connu
 * (sans connexion automatique ni modification de ses données), sinon crée un compte « pending » sans mot de passe
 * et lui envoie le lien d'activation (jeton valable 7 jours) pour choisir son mot de passe.
 */
final class CreerCompteDepuisReservation
{
    private const ACTIVATION_TTL = 'P7D';

    public function __construct(
        private UserRepository $users,
        private TokenService $tokens,
        private Notifier $notifier,
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

        $token = $this->tokens->issue($user->id(), TokenType::Activation, new \DateInterval(self::ACTIVATION_TTL));
        $this->notifier->send($email, 'activation', ['firstname' => $user->firstname(), 'token' => $token]);

        return $user->id();
    }
}
