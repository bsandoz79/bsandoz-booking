<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Domain\Port;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Shared\Domain\NotFound;

interface UserRepository
{
    /** @throws NotFound */
    public function get(string $id): User;

    /** E-mail comparé en minuscules. */
    public function findByEmail(string $email): ?User;

    public function save(User $user): void;
}
