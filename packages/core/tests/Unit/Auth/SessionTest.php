<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Auth;

use Bsandoz\Core\Auth\Application\RenouvelerSession;
use Bsandoz\Core\Auth\Application\SeConnecter;
use Bsandoz\Core\Auth\Application\SeDeconnecter;
use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Model\UserStatus;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Bsandoz\Core\Shared\Domain\NonAuthentifie;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryTokenService;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use PHPUnit\Framework\TestCase;

final class SessionTest extends TestCase
{
    private InMemoryUserRepository $users;
    private InMemoryTokenService $tokens;
    private FrozenClock $clock;
    private SeConnecter $connecter;
    private RenouvelerSession $renouveler;

    protected function setUp(): void
    {
        $hasher = new NativePasswordHasherAdapter();
        $this->users = new InMemoryUserRepository();
        $this->clock = new FrozenClock('2026-11-07 10:00');
        $this->tokens = new InMemoryTokenService($this->clock);

        $active = new User('u-1', 'camille@example.test', 'Camille', 'Martin', '0600000000');
        $active->activate($hasher->hash('bonjour2026'));
        $this->users->save($active);
        $this->users->save(new User('u-2', 'attente@example.test', 'En', 'Attente', '0600000000'));
        $pro = new User('u-3', 'pro@example.test', 'Le', 'Pro', '0600000000', ['ROLE_PRO']);
        $pro->activate($hasher->hash('artisan2026'));
        $this->users->save($pro);

        $this->connecter = new SeConnecter($this->users, $hasher, $this->tokens);
        $this->renouveler = new RenouvelerSession($this->tokens, $this->users);
    }

    public function testConnexion(): void
    {
        $session = ($this->connecter)(' Camille@Example.test ', 'bonjour2026');

        self::assertSame('u-1', $session->userId);
        self::assertSame(['ROLE_CLIENT'], $session->roles);
        self::assertNotSame('', $session->refreshToken);
    }

    public function testRolesDuPro(): void
    {
        self::assertSame(['ROLE_PRO'], ($this->connecter)('pro@example.test', 'artisan2026')->roles);
    }

    /** @return iterable<string, array{string, string}> */
    public static function identifiantsRefuses(): iterable
    {
        yield 'mauvais mot de passe' => ['camille@example.test', 'bonjour2027'];
        yield 'e-mail inconnu' => ['inconnu@example.test', 'bonjour2026'];
        yield 'compte en attente (sans mot de passe)' => ['attente@example.test', 'bonjour2026'];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('identifiantsRefuses')]
    public function testIdentifiantsRefusesAvecLeMemeMessage(string $email, string $password): void
    {
        $this->expectException(NonAuthentifie::class);
        $this->expectExceptionMessage('E-mail ou mot de passe incorrect.');
        ($this->connecter)($email, $password);
    }

    public function testCompteSupprimeNePeutPlusSeConnecter(): void
    {
        $user = $this->users->get('u-1');
        $user->anonymize();
        $this->users->save($user);

        $this->expectException(NonAuthentifie::class);
        ($this->connecter)('camille@example.test', 'bonjour2026');
    }

    public function testRenouvellementAvecRotationDuJeton(): void
    {
        $session = ($this->connecter)('camille@example.test', 'bonjour2026');
        $nouvelle = ($this->renouveler)($session->refreshToken);

        self::assertSame('u-1', $nouvelle->userId);
        self::assertNotSame($session->refreshToken, $nouvelle->refreshToken);

        $this->expectException(NonAuthentifie::class);
        ($this->renouveler)($session->refreshToken);
    }

    public function testSessionExpireeApresTrenteJours(): void
    {
        $session = ($this->connecter)('camille@example.test', 'bonjour2026');
        $this->clock->modify('+30 days');

        $this->expectException(NonAuthentifie::class);
        ($this->renouveler)($session->refreshToken);
    }

    public function testPlusieursAppareilsConnectes(): void
    {
        $telephone = ($this->connecter)('camille@example.test', 'bonjour2026');
        $ordinateur = ($this->connecter)('camille@example.test', 'bonjour2026');

        self::assertSame('u-1', ($this->renouveler)($telephone->refreshToken)->userId);
        self::assertSame('u-1', ($this->renouveler)($ordinateur->refreshToken)->userId);
    }

    public function testDeconnexion(): void
    {
        $session = ($this->connecter)('camille@example.test', 'bonjour2026');
        (new SeDeconnecter($this->tokens))($session->refreshToken);
        (new SeDeconnecter($this->tokens))(null);

        $this->expectException(NonAuthentifie::class);
        ($this->renouveler)($session->refreshToken);
    }

    public function testAnonymisation(): void
    {
        $user = $this->users->get('u-1');
        $user->anonymize();

        self::assertSame('supprime-u-1@invalid', $user->email());
        self::assertSame('', $user->firstname());
        self::assertSame('', $user->lastname());
        self::assertSame('', $user->phone());
        self::assertNull($user->passwordHash());
        self::assertSame([], $user->roles());
        self::assertSame(UserStatus::Deleted, $user->status());
        self::assertFalse($user->canLogIn());
    }
}
