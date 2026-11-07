<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\Zone;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** Invariants des règles de réservation, des plages d'ouverture et de la zone. */
final class BookingModelsTest extends TestCase
{
    public function testReglesParDefautValides(): void
    {
        $rules = new BookingRules();

        self::assertSame(24, $rules->minNoticeHours);
        self::assertSame(30, $rules->depositPercent);
        self::assertSame(10, $rules->holdMinutes);
    }

    public function testReglesALaLimiteValides(): void
    {
        $rules = new BookingRules(minNoticeHours: 0, horizonDays: 1, bufferMin: 0, slotStepMin: 5, freeCancelHours: 0, depositPercent: 100, depositFixedCents: 0, holdMinutes: 1);

        self::assertSame(5, $rules->slotStepMin);
    }

    /** @return iterable<string, array{callable(): BookingRules}> */
    public static function reglesInvalides(): iterable
    {
        yield 'délai minimum négatif' => [static fn () => new BookingRules(minNoticeHours: -1)];
        yield 'horizon nul' => [static fn () => new BookingRules(horizonDays: 0)];
        yield 'tampon négatif' => [static fn () => new BookingRules(bufferMin: -5)];
        yield 'pas nul (boucle infinie)' => [static fn () => new BookingRules(slotStepMin: 0)];
        yield 'pas trop fin' => [static fn () => new BookingRules(slotStepMin: 4)];
        yield 'annulation négative' => [static fn () => new BookingRules(freeCancelHours: -1)];
        yield 'acompte négatif' => [static fn () => new BookingRules(depositPercent: -1)];
        yield 'acompte au-delà de 100 %' => [static fn () => new BookingRules(depositPercent: 101)];
        yield 'acompte fixe négatif' => [static fn () => new BookingRules(depositPercent: null, depositFixedCents: -100)];
        yield 'blocage nul' => [static fn () => new BookingRules(holdMinutes: 0)];
    }

    #[DataProvider('reglesInvalides')]
    public function testReglesInvalides(callable $create): void
    {
        $this->expectException(DomainError::class);
        $create();
    }

    public function testPlagesDOuvertureValides(): void
    {
        self::assertSame('08:00', (new OpeningHour(1, '08:00', '12:00'))->startsAt);
        self::assertSame('24:00', (new OpeningHour(7, '20:00', '24:00'))->endsAt);
        self::assertSame('00:00', (new OpeningHour(3, '00:00', '23:59'))->startsAt);
    }

    /** @return iterable<string, array{int, string, string}> */
    public static function plagesInvalides(): iterable
    {
        yield 'jour 0' => [0, '08:00', '12:00'];
        yield 'jour 8' => [8, '08:00', '12:00'];
        yield 'fin égale au début' => [1, '08:00', '08:00'];
        yield 'fin avant le début' => [1, '14:00', '12:00'];
        yield 'heure sans zéro' => [1, '8:00', '12:00'];
        yield 'heure impossible' => [1, '08:00', '25:00'];
        yield 'minutes impossibles' => [1, '08:60', '12:00'];
        yield 'texte' => [1, 'matin', '12:00'];
        yield 'début à 24:00' => [1, '24:00', '24:00'];
    }

    #[DataProvider('plagesInvalides')]
    public function testPlagesDOuvertureInvalides(int $weekday, string $start, string $end): void
    {
        $this->expectException(DomainError::class);
        new OpeningHour($weekday, $start, $end);
    }

    /** @return iterable<string, array{callable(): Zone}> */
    public static function zonesInvalides(): iterable
    {
        yield 'latitude impossible' => [static fn () => new Zone(91, 2, 15, Money::cents(50), 60)];
        yield 'longitude impossible' => [static fn () => new Zone(49, -181, 15, Money::cents(50), 60)];
        yield 'rayon gratuit négatif' => [static fn () => new Zone(49, 2, -1, Money::cents(50), 60)];
        yield 'distance maximale négative' => [static fn () => new Zone(49, 2, 15, Money::cents(50), -1)];
        yield 'coefficient routier < 1' => [static fn () => new Zone(49, 2, 15, Money::cents(50), 60, 0.9)];
        yield 'vitesse nulle (division par zéro)' => [static fn () => new Zone(49, 2, 15, Money::cents(50), 60, 1.3, 0)];
    }

    #[DataProvider('zonesInvalides')]
    public function testZonesInvalides(callable $create): void
    {
        $this->expectException(DomainError::class);
        $create();
    }
}
