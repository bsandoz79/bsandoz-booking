<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Port\PasswordHasher;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Auth\Domain\Service\PolitiqueMotDePasse;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;

/** Compte du pro (accès à l'espace pro), créé en ligne de commande à l'installation : actif tout de suite. */
final class CreerComptePro
{
    public function __construct(
        private UserRepository $users,
        private PasswordHasher $hasher,
        private PolitiqueMotDePasse $politique,
        private IdGenerator $ids,
        private Clock $clock,
    ) {
    }

    /** @throws DomainError e-mail invalide ou déjà utilisé, mot de passe trop faible */
    public function __invoke(string $email, string $firstname, string $lastname, string $plainPassword): string
    {
        $email = mb_strtolower(trim($email));
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new DomainError('Adresse e-mail invalide.');
        }
        if ($this->users->findByEmail($email) !== null) {
            throw new DomainError('Un compte existe déjà avec cette adresse.');
        }
        $this->politique->verifier($plainPassword);

        $user = new User($this->ids->generate(), $email, trim($firstname), trim($lastname), '', ['ROLE_PRO'], $this->clock->now());
        $user->activate($this->hasher->hash($plainPassword));
        $this->users->save($user);

        return $user->id();
    }
}
