<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Infrastructure\Security;

use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Shared\Domain\NotFound;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

/**
 * Charge le compte à chaque requête authentifiée (identifiant = id du compte, porté par le jeton JWT).
 * Un compte supprimé ou désactivé est refusé aussitôt, même avec un jeton encore valide.
 *
 * @implements UserProviderInterface<SecurityUser>
 */
final class SecurityUserProvider implements UserProviderInterface
{
    public function __construct(private UserRepository $users)
    {
    }

    public function loadUserByIdentifier(string $identifier): SecurityUser
    {
        try {
            $user = $this->users->get($identifier);
        } catch (NotFound) {
            throw new UserNotFoundException();
        }
        if (!$user->canLogIn()) {
            throw new UserNotFoundException();
        }

        return new SecurityUser($user->id(), $user->roles());
    }

    public function refreshUser(UserInterface $user): SecurityUser
    {
        if (!$user instanceof SecurityUser) {
            throw new UnsupportedUserException(get_debug_type($user));
        }

        return $this->loadUserByIdentifier($user->getUserIdentifier());
    }

    public function supportsClass(string $class): bool
    {
        return $class === SecurityUser::class;
    }
}
