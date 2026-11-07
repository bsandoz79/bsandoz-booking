<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Shared\Domain\NotFound;

final class InMemoryUserRepository implements UserRepository
{
    /** @var array<string, User> */
    private array $items = [];

    public function get(string $id): User
    {
        return $this->items[$id] ?? throw new NotFound('Compte introuvable.');
    }

    public function findByEmail(string $email): ?User
    {
        foreach ($this->items as $user) {
            if ($user->email() === mb_strtolower(trim($email))) {
                return $user;
            }
        }

        return null;
    }

    public function save(User $user): void
    {
        $this->items[$user->id()] = $user;
    }
}
