<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Infrastructure\Security;

use Bsandoz\Core\Auth\Domain\Port\PasswordHasher;
use Symfony\Component\PasswordHasher\Hasher\NativePasswordHasher;

/** Hachage « auto » de Symfony (bcrypt / argon2 selon la plateforme). */
final class NativePasswordHasherAdapter implements PasswordHasher
{
    private NativePasswordHasher $hasher;

    public function __construct()
    {
        $this->hasher = new NativePasswordHasher();
    }

    public function hash(string $plainPassword): string
    {
        return $this->hasher->hash($plainPassword);
    }

    public function verify(string $hash, string $plainPassword): bool
    {
        return $this->hasher->verify($hash, $plainPassword);
    }
}
