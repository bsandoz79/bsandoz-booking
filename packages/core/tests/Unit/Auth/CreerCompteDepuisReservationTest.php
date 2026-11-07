<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Auth;

use Bsandoz\Core\Auth\Application\CreerCompteDepuisReservation;
use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Model\UserStatus;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryTokenService;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use Bsandoz\Core\Tests\Double\RecordingNotifier;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

final class CreerCompteDepuisReservationTest extends TestCase
{
    private InMemoryUserRepository $users;
    private InMemoryTokenService $tokens;
    private RecordingNotifier $notifier;
    private FrozenClock $clock;
    private CreerCompteDepuisReservation $creer;

    protected function setUp(): void
    {
        $this->users = new InMemoryUserRepository();
        $this->clock = new FrozenClock('2026-11-07 10:00');
        $this->tokens = new InMemoryTokenService($this->clock);
        $this->notifier = new RecordingNotifier();
        $this->creer = new CreerCompteDepuisReservation($this->users, $this->tokens, $this->notifier, new SequenceIdGenerator('u'), $this->clock);
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

    public function testEnvoieLeLienDActivationValableSeptJours(): void
    {
        $id = ($this->creer)('camille@example.test', 'Camille', 'Martin', '0600000000');

        $mails = $this->notifier->of('activation');
        self::assertCount(1, $mails);
        self::assertSame('camille@example.test', $mails[0]['to']);
        self::assertSame('Camille', $mails[0]['context']['firstname']);

        $token = $mails[0]['context']['token'];
        self::assertIsString($token);
        $this->clock->modify('+6 days');
        self::assertSame($id, $this->tokens->verify($token, TokenType::Activation));
        $this->clock->modify('+1 day');
        self::assertNull($this->tokens->verify($token, TokenType::Activation));
    }

    public function testReutiliseLeCompteExistantSansLeModifierNiRenvoyerDeMail(): void
    {
        $premier = ($this->creer)('camille@example.test', 'Camille', 'Martin', '0600000000');
        $second = ($this->creer)('CAMILLE@example.test', 'Autre', 'Nom', '0700000000');

        self::assertSame($premier, $second);
        self::assertSame('Camille', $this->users->get($premier)->firstname());
        self::assertCount(1, $this->notifier->of('activation'));
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
