<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Auth;

use Bsandoz\Core\Auth\Application\ActiverCompte;
use Bsandoz\Core\Auth\Application\CreerCompteDepuisReservation;
use Bsandoz\Core\Auth\Application\DemanderReinitialisation;
use Bsandoz\Core\Auth\Application\ReinitialiserMotDePasse;
use Bsandoz\Core\Auth\Domain\Model\UserStatus;
use Bsandoz\Core\Auth\Domain\Service\PolitiqueMotDePasse;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryTokenService;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use Bsandoz\Core\Tests\Double\RecordingNotifier;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

/** Activation du compte et mot de passe oublié, du mail jusqu'au nouveau mot de passe. */
final class MotDePasseParLienTest extends TestCase
{
    private InMemoryUserRepository $users;
    private InMemoryTokenService $tokens;
    private RecordingNotifier $notifier;
    private FrozenClock $clock;
    private NativePasswordHasherAdapter $hasher;
    private string $userId;

    protected function setUp(): void
    {
        $this->users = new InMemoryUserRepository();
        $this->clock = new FrozenClock('2026-11-07 10:00');
        $this->tokens = new InMemoryTokenService($this->clock);
        $this->notifier = new RecordingNotifier();
        $this->hasher = new NativePasswordHasherAdapter();
        $this->userId = (new CreerCompteDepuisReservation($this->users, $this->tokens, $this->notifier, new SequenceIdGenerator('u'), $this->clock))('camille@example.test', 'Camille', 'Martin', '0600000000');
    }

    private function lien(string $template): string
    {
        $mails = $this->notifier->of($template);
        $token = end($mails)['context']['token'] ?? null;
        self::assertIsString($token);

        return $token;
    }

    private function activer(): ActiverCompte
    {
        return new ActiverCompte($this->users, $this->tokens, $this->hasher, new PolitiqueMotDePasse());
    }

    private function reinitialiser(): ReinitialiserMotDePasse
    {
        return new ReinitialiserMotDePasse($this->users, $this->tokens, $this->hasher, new PolitiqueMotDePasse());
    }

    private function demander(string $email): void
    {
        (new DemanderReinitialisation($this->users, $this->tokens, $this->notifier))($email);
    }

    public function testActivationAvecLeLienDuMail(): void
    {
        ($this->activer())($this->lien('activation'), 'bonjour2026');

        $user = $this->users->get($this->userId);
        self::assertSame(UserStatus::Active, $user->status());
        self::assertTrue($this->hasher->verify((string) $user->passwordHash(), 'bonjour2026'));
    }

    public function testLeLienDActivationNeSertQuUneFois(): void
    {
        $lien = $this->lien('activation');
        ($this->activer())($lien, 'bonjour2026');

        $this->expectException(DomainError::class);
        ($this->activer())($lien, 'autre2026xx');
    }

    public function testMotDePasseTropFaibleNeGrillePasLeLien(): void
    {
        $lien = $this->lien('activation');
        try {
            ($this->activer())($lien, 'court1');
        } catch (DomainError) {
        }

        ($this->activer())($lien, 'bonjour2026');
        self::assertSame(UserStatus::Active, $this->users->get($this->userId)->status());
    }

    public function testLienDActivationExpire(): void
    {
        $lien = $this->lien('activation');
        $this->clock->modify('+7 days');

        $this->expectException(DomainError::class);
        ($this->activer())($lien, 'bonjour2026');
    }

    public function testMotDePasseOubliePuisNouveauMotDePasse(): void
    {
        ($this->activer())($this->lien('activation'), 'bonjour2026');
        $this->demander(' CAMILLE@example.test ');

        $mails = $this->notifier->of('password_reset');
        self::assertCount(1, $mails);
        self::assertSame('camille@example.test', $mails[0]['to']);

        ($this->reinitialiser())($this->lien('password_reset'), 'nouveau2027');
        self::assertTrue($this->hasher->verify((string) $this->users->get($this->userId)->passwordHash(), 'nouveau2027'));
    }

    public function testNouveauMotDePasseFermeToutesLesSessions(): void
    {
        $session = $this->tokens->issue($this->userId, \Bsandoz\Core\Auth\Domain\Model\TokenType::Refresh, new \DateInterval('P30D'), false);
        $this->demander('camille@example.test');

        ($this->reinitialiser())($this->lien('password_reset'), 'nouveau2027');

        self::assertNull($this->tokens->verify($session, \Bsandoz\Core\Auth\Domain\Model\TokenType::Refresh));
    }

    public function testEmailInconnuSansMailNiErreur(): void
    {
        $this->demander('inconnu@example.test');

        self::assertSame([], $this->notifier->of('password_reset'));
    }

    public function testLienDeReinitialisationValableUneHeure(): void
    {
        $this->demander('camille@example.test');
        $lien = $this->lien('password_reset');
        $this->clock->modify('+1 hour');

        $this->expectException(DomainError::class);
        ($this->reinitialiser())($lien, 'nouveau2027');
    }

    public function testReinitialiserActiveUnCompteEnAttente(): void
    {
        $this->demander('camille@example.test');
        ($this->reinitialiser())($this->lien('password_reset'), 'nouveau2027');

        self::assertSame(UserStatus::Active, $this->users->get($this->userId)->status());
    }

    public function testUnLienDActivationNeReinitialisePas(): void
    {
        $this->expectException(DomainError::class);
        ($this->reinitialiser())($this->lien('activation'), 'nouveau2027');
    }
}
