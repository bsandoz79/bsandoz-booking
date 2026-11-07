<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Shared;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\TimeRange;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class TimeRangeTest extends TestCase
{
    private static function range(string $start, string $end): TimeRange
    {
        $utc = new \DateTimeZone('UTC');
        return new TimeRange(new \DateTimeImmutable("2026-11-10 $start", $utc), new \DateTimeImmutable("2026-11-10 $end", $utc));
    }

    public function testDureeEnMinutes(): void
    {
        self::assertSame(90, self::range('08:00', '09:30')->minutes());
    }

    public function testLaFinDoitEtreApresLeDebut(): void
    {
        $this->expectException(DomainError::class);
        self::range('10:00', '10:00');
    }

    public function testLaFinNePeutPasPrecederLeDebut(): void
    {
        $this->expectException(DomainError::class);
        self::range('10:00', '09:00');
    }

    /** @return iterable<string, array{string, string, bool}> */
    public static function chevauchements(): iterable
    {
        // Intervalle de référence : 10:00 → 12:00
        yield 'avant, sans contact' => ['08:00', '09:00', false];
        yield 'se termine au début (borne exclue)' => ['08:00', '10:00', false];
        yield 'mord sur le début' => ['09:00', '10:30', true];
        yield 'contenu' => ['10:30', '11:30', true];
        yield 'identique' => ['10:00', '12:00', true];
        yield 'englobe' => ['09:00', '13:00', true];
        yield 'mord sur la fin' => ['11:30', '13:00', true];
        yield 'commence à la fin (borne exclue)' => ['12:00', '13:00', false];
        yield 'après, sans contact' => ['13:00', '14:00', false];
    }

    #[DataProvider('chevauchements')]
    public function testChevauchementSymetrique(string $start, string $end, bool $attendu): void
    {
        $reference = self::range('10:00', '12:00');
        $autre = self::range($start, $end);

        self::assertSame($attendu, $reference->overlaps($autre));
        self::assertSame($attendu, $autre->overlaps($reference));
    }

    public function testInclusion(): void
    {
        $journee = self::range('08:00', '18:00');

        self::assertTrue($journee->contains(self::range('08:00', '10:00')), 'bornes incluses au début');
        self::assertTrue($journee->contains(self::range('16:00', '18:00')), 'bornes incluses à la fin');
        self::assertTrue($journee->contains($journee));
        self::assertFalse($journee->contains(self::range('17:00', '19:00')));
        self::assertFalse($journee->contains(self::range('07:00', '09:00')));
        self::assertFalse(self::range('10:00', '11:00')->contains($journee));
    }
}
