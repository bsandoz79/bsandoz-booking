<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Infrastructure\Security;

use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Utilisateur vu par le composant Security de Symfony : identifiant (id du compte) et rôles seulement.
 * Le domaine (Auth\Domain\Model\User) ne dépend pas de Symfony.
 */
final class SecurityUser implements UserInterface
{
    /** @param list<string> $roles */
    public function __construct(
        private string $id,
        private array $roles,
    ) {
    }

    public function id(): string
    {
        return $this->id;
    }

    /** @return non-empty-string */
    public function getUserIdentifier(): string
    {
        return $this->id !== '' ? $this->id : throw new \LogicException('Identifiant vide.');
    }

    /** @return list<string> */
    public function getRoles(): array
    {
        return $this->roles;
    }

    public function eraseCredentials(): void
    {
    }
}
