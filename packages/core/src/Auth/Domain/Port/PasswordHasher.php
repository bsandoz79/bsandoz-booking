<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Domain\Port;

interface PasswordHasher
{
    public function hash(string $plainPassword): string;

    public function verify(string $hash, string $plainPassword): bool;
}
