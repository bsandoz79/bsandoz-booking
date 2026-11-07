<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Auth;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Model\UserStatus;
use PHPUnit\Framework\TestCase;

final class UserTest extends TestCase
{
    public function testExposeSesDonneesEtCommenceEnAttente(): void
    {
        $createdAt = new \DateTimeImmutable('2026-11-07 10:00:00', new \DateTimeZone('UTC'));
        $user = new User('u-1', 'client@example.test', 'Camille', 'Martin', '0600000000', createdAt: $createdAt);

        self::assertSame('u-1', $user->id());
        self::assertSame('client@example.test', $user->email());
        self::assertSame('Camille', $user->firstname());
        self::assertSame('Martin', $user->lastname());
        self::assertSame('0600000000', $user->phone());
        self::assertSame($createdAt, $user->createdAt());
        self::assertSame(['ROLE_CLIENT'], $user->roles());
        self::assertSame(UserStatus::Pending, $user->status());
        self::assertNull($user->passwordHash());
    }

    public function testActivationEnregistreLeMotDePasse(): void
    {
        $user = new User('u-1', 'client@example.test', 'Camille', 'Martin', '0600000000');
        $user->activate('hash');

        self::assertSame(UserStatus::Active, $user->status());
        self::assertSame('hash', $user->passwordHash());
    }
}
