<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration\Auth;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Model\UserStatus;
use Bsandoz\Core\Auth\Infrastructure\Persistence\DoctrineUserRepository;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Tests\Integration\DoctrineTestCase;

final class DoctrineUserRepositoryTest extends DoctrineTestCase
{
    public function testEnregistreRelitEtRetrouveParEmail(): void
    {
        $repository = new DoctrineUserRepository($this->em);
        $createdAt = new \DateTimeImmutable('2026-11-07 10:00', new \DateTimeZone('UTC'));
        $user = new User('u-1', 'camille@example.test', 'Camille', 'Martin', '0600000000', ['ROLE_CLIENT'], $createdAt);
        $user->activate('hash');
        $repository->save($user);
        $this->reload();

        $relu = $repository->get('u-1');
        self::assertSame('camille@example.test', $relu->email());
        self::assertSame('Martin', $relu->lastname());
        self::assertSame(['ROLE_CLIENT'], $relu->roles());
        self::assertSame(UserStatus::Active, $relu->status());
        self::assertSame('hash', $relu->passwordHash());
        self::assertEquals($createdAt, $relu->createdAt());

        self::assertSame('u-1', $repository->findByEmail(' Camille@Example.test ')?->id());
        self::assertNull($repository->findByEmail('autre@example.test'));
    }

    public function testCompteIntrouvable(): void
    {
        $this->expectException(NotFound::class);
        (new DoctrineUserRepository($this->em))->get('inconnu');
    }
}
