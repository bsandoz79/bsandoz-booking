<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration\Auth;

use Bsandoz\Core\Auth\Domain\Model\AuthToken;
use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Infrastructure\Security\DoctrineTokenService;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use Bsandoz\Core\Tests\Integration\DoctrineTestCase;

final class DoctrineTokenServiceTest extends DoctrineTestCase
{
    private FrozenClock $clock;
    private DoctrineTokenService $tokens;

    protected function setUp(): void
    {
        parent::setUp();
        $this->clock = new FrozenClock('2026-11-07 10:00');
        $this->tokens = new DoctrineTokenService($this->em, new SequenceIdGenerator('t'), $this->clock);
    }

    public function testJetonAleatoireDontSeulLeHachageEstStocke(): void
    {
        $plain = $this->tokens->issue('u-1', TokenType::Activation, new \DateInterval('P7D'));

        self::assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $plain);
        $stored = $this->em->getRepository(AuthToken::class)->findAll();
        self::assertCount(1, $stored);
        self::assertSame(hash('sha256', $plain), $stored[0]->tokenHash());
        self::assertSame(hash('sha256', $plain), $this->em->getConnection()->fetchOne('SELECT token_hash FROM auth_token'), 'la valeur en clair n\'est jamais en base');
    }

    public function testJetonAUsageUnique(): void
    {
        $plain = $this->tokens->issue('u-1', TokenType::Activation, new \DateInterval('P7D'));

        self::assertSame('u-1', $this->tokens->consume($plain, TokenType::Activation));
        self::assertNull($this->tokens->consume($plain, TokenType::Activation), 'déjà utilisé');
    }

    public function testJetonExpire(): void
    {
        $plain = $this->tokens->issue('u-1', TokenType::PasswordReset, new \DateInterval('PT1H'));
        $this->clock->modify('+1 hour');

        self::assertNull($this->tokens->consume($plain, TokenType::PasswordReset));
    }

    public function testMauvaisTypeOuValeurInvalide(): void
    {
        $plain = $this->tokens->issue('u-1', TokenType::Activation, new \DateInterval('P7D'));

        self::assertNull($this->tokens->consume($plain, TokenType::PasswordReset), 'un lien d\'activation ne réinitialise pas le mot de passe');
        self::assertNull($this->tokens->consume('inconnu', TokenType::Activation));
        self::assertNull($this->tokens->consume(str_repeat('0', 64), TokenType::Activation));
    }

    public function testSeulLeDernierLienFonctionne(): void
    {
        $ancien = $this->tokens->issue('u-1', TokenType::PasswordReset, new \DateInterval('PT1H'));
        $autreCompte = $this->tokens->issue('u-2', TokenType::PasswordReset, new \DateInterval('PT1H'));
        $nouveau = $this->tokens->issue('u-1', TokenType::PasswordReset, new \DateInterval('PT1H'));

        self::assertNull($this->tokens->consume($ancien, TokenType::PasswordReset));
        self::assertSame('u-1', $this->tokens->consume($nouveau, TokenType::PasswordReset));
        self::assertSame('u-2', $this->tokens->consume($autreCompte, TokenType::PasswordReset), 'les autres comptes ne sont pas touchés');
    }

    public function testJetonDeGestionReutilisableJusquaExpiration(): void
    {
        $plain = $this->tokens->issue('r-1', TokenType::ManageReservation, new \DateInterval('P10D'));

        self::assertSame('r-1', $this->tokens->verify($plain, TokenType::ManageReservation));
        self::assertSame('r-1', $this->tokens->verify($plain, TokenType::ManageReservation), 'non consommé');

        $this->clock->modify('+10 days');
        self::assertNull($this->tokens->verify($plain, TokenType::ManageReservation));
    }
}
