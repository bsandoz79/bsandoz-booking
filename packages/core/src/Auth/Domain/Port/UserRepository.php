<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Domain\Port;

use Bsandoz\Core\Auth\Domain\Model\User;

interface UserRepository
{
    public function get(string $id): User;

    public function findByEmail(string $email): ?User;

    public function save(User $user): void;
}
