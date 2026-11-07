<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Auth;

use Bsandoz\Core\Auth\Application\CreerCompteDepuisReservation;
use Bsandoz\Core\Auth\Domain\Model\UserStatus;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

final class CreerCompteDepuisReservationTest extends TestCase
{
    private InMemoryUserRepository $users;
    private CreerCompteDepuisReservation $creer;

    protected function setUp(): void
    {
        $this->users = new InMemoryUserRepository();
        $this->creer = new CreerCompteDepuisReservation($this->users, new SequenceIdGenerator('u'), new FrozenClock('2026-11-07 10:00'));
    }

    public function testCreeUnCompteEnAttenteSansMotDePasse(): void
    {
        $id = ($this->creer)('  Camille.Martin@Example.TEST ', ' Camille ', 'Martin', '06 00 00 00 00');

        $user = $this->users->get($id);
        self::assertSame('u-1', $id);
        self::assertSame('camille.martin@example.test', $user->email(), 'e-mail normalisé');
        self::assertSame('Camille', $user->firstname());
        self::assertSame(UserStatus::Pending, $user->status());
        self::assertNull($user->passwordHash());
        self::assertSame(['ROLE_CLIENT'], $user->roles());
        self::assertSame('2026-11-07T10:00:00+00:00', $user->createdAt()?->format(DATE_ATOM));
    }

    public function testReutiliseLeCompteExistantSansLeModifier(): void
    {
        $premier = ($this->creer)('camille@example.test', 'Camille', 'Martin', '0600000000');
        $second = ($this->creer)('CAMILLE@example.test', 'Autre', 'Nom', '0700000000');

        self::assertSame($premier, $second);
        self::assertSame('Camille', $this->users->get($premier)->firstname());
    }

    public function testEmailInvalide(): void
    {
        $this->expectException(DomainError::class);
        ($this->creer)('pas-un-email', 'Camille', 'Martin', '0600000000');
    }

    public function testNomObligatoire(): void
    {
        $this->expectException(DomainError::class);
        ($this->creer)('camille@example.test', ' ', 'Martin', '0600000000');
    }
}
