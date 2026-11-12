<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Auth;

use Bsandoz\Core\Auth\Application\CreerComptePro;
use Bsandoz\Core\Auth\Domain\Model\UserStatus;
use Bsandoz\Core\Auth\Domain\Service\PolitiqueMotDePasse;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

final class CreerCompteProTest extends TestCase
{
    private InMemoryUserRepository $users;
    private CreerComptePro $creer;

    protected function setUp(): void
    {
        $this->users = new InMemoryUserRepository();
        $this->creer = new CreerComptePro($this->users, new NativePasswordHasherAdapter(), new PolitiqueMotDePasse(), new SequenceIdGenerator('pro'), new FrozenClock('2026-11-08 10:00'));
    }

    public function testCompteProActif(): void
    {
        $id = ($this->creer)(' Artisan@Example.test ', 'Alex', 'Dupont', 'artisan2026');

        $user = $this->users->get($id);
        self::assertSame('artisan@example.test', $user->email());
        self::assertSame(['ROLE_PRO'], $user->roles());
        self::assertSame(UserStatus::Active, $user->status());
        self::assertTrue($user->canLogIn());
    }

    public function testEmailDejaUtilise(): void
    {
        ($this->creer)('artisan@example.test', 'Alex', 'Dupont', 'artisan2026');

        $this->expectException(DomainError::class);
        ($this->creer)('artisan@example.test', 'Autre', 'Compte', 'artisan2027');
    }

    public function testMotDePasseTropFaible(): void
    {
        $this->expectException(DomainError::class);
        ($this->creer)('artisan@example.test', 'Alex', 'Dupont', 'court');
    }
}
