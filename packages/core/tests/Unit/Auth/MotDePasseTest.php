<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Auth;

use Bsandoz\Core\Auth\Domain\Service\PolitiqueMotDePasse;
use Bsandoz\Core\Auth\Infrastructure\Security\NativePasswordHasherAdapter;
use Bsandoz\Core\Shared\Domain\DomainError;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class MotDePasseTest extends TestCase
{
    public function testMotsDePasseAcceptes(): void
    {
        $politique = new PolitiqueMotDePasse();
        $politique->verifier('bonjour2026');
        $politique->verifier('Éléphant rose 7');

        $this->expectNotToPerformAssertions();
    }

    /** @return iterable<string, array{string}> */
    public static function motsDePasseRefuses(): iterable
    {
        yield 'trop court' => ['abc12345'];
        yield 'sans chiffre' => ['motdepasselong'];
        yield 'sans lettre' => ['1234567890'];
        yield 'vide' => [''];
    }

    #[DataProvider('motsDePasseRefuses')]
    public function testMotsDePasseRefuses(string $password): void
    {
        $this->expectException(DomainError::class);
        (new PolitiqueMotDePasse())->verifier($password);
    }

    public function testHachageEtVerification(): void
    {
        $hasher = new NativePasswordHasherAdapter();
        $hash = $hasher->hash('bonjour2026');

        self::assertNotSame('bonjour2026', $hash);
        self::assertTrue($hasher->verify($hash, 'bonjour2026'));
        self::assertFalse($hasher->verify($hash, 'bonjour2027'));
    }
}
