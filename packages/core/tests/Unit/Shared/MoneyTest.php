<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Shared;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class MoneyTest extends TestCase
{
    public function testAdditionEtPourcentage(): void
    {
        $total = Money::cents(12900)->add(Money::cents(1000));
        self::assertSame(13900, $total->cents);
        self::assertSame(4170, $total->percent(30)->cents);
    }

    public function testRefuseLesMontantsNegatifs(): void
    {
        $this->expectException(DomainError::class);
        Money::cents(-1);
    }

    public function testZeroVautZeroCentime(): void
    {
        self::assertSame(0, Money::zero()->cents);
        self::assertTrue(Money::zero()->equals(Money::cents(0)));
    }

    public function testEstImmuable(): void
    {
        $prix = Money::cents(1000);
        $prix->add(Money::cents(500));
        $prix->multiply(3);
        $prix->percent(50);

        self::assertSame(1000, $prix->cents);
    }

    public function testMultiplication(): void
    {
        self::assertSame(3000, Money::cents(1000)->multiply(3)->cents);
        self::assertSame(0, Money::cents(1000)->multiply(0)->cents);
    }

    public function testMultiplicationParUnFacteurNegatifRefusee(): void
    {
        $this->expectException(DomainError::class);
        Money::cents(1000)->multiply(-1);
    }

    /** @return iterable<string, array{int, int, int}> */
    public static function pourcentages(): iterable
    {
        yield 'exact' => [10000, 30, 3000];
        yield 'arrondi au centime supérieur' => [1001, 30, 301];
        yield 'fraction minime arrondie' => [1, 1, 1];
        yield 'zéro pour cent' => [12900, 0, 0];
        yield 'cent pour cent' => [12900, 100, 12900];
    }

    #[DataProvider('pourcentages')]
    public function testPourcentageArrondiAuCentimeSuperieur(int $cents, int $percent, int $attendu): void
    {
        self::assertSame($attendu, Money::cents($cents)->percent($percent)->cents);
    }

    public function testMinRenvoieLePlusPetitMontant(): void
    {
        $petit = Money::cents(500);
        $grand = Money::cents(900);

        self::assertSame($petit, $petit->min($grand));
        self::assertSame($petit, $grand->min($petit));
    }

    public function testEgalite(): void
    {
        self::assertTrue(Money::cents(4200)->equals(Money::cents(4200)));
        self::assertFalse(Money::cents(4200)->equals(Money::cents(4201)));
    }

    /** @return iterable<string, array{int, string}> */
    public static function formats(): iterable
    {
        yield 'zéro' => [0, "0,00\u{00A0}€"];
        yield 'centimes' => [5, "0,05\u{00A0}€"];
        yield 'euros ronds' => [12900, "129,00\u{00A0}€"];
        yield 'milliers' => [129900, "1\u{202F}299,00\u{00A0}€"];
        yield 'millions' => [123456789, "1\u{202F}234\u{202F}567,89\u{00A0}€"];
    }

    #[DataProvider('formats')]
    public function testFormatFrancais(int $cents, string $attendu): void
    {
        self::assertSame($attendu, Money::cents($cents)->format());
    }
}
