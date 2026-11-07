<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Service\CreneauCalculator;
use Bsandoz\Core\Shared\Domain\TimeRange;
use PHPUnit\Framework\TestCase;

final class CreneauCalculatorTest extends TestCase
{
    private \DateTimeZone $tz;
    private BookingRules $rules;
    /** @var list<OpeningHour> */
    private array $hours;

    protected function setUp(): void
    {
        $this->tz = new \DateTimeZone('Europe/Paris');
        $this->rules = new BookingRules(minNoticeHours: 24, horizonDays: 60, bufferMin: 0, slotStepMin: 60);
        $this->hours = [new OpeningHour(2, '08:00', '12:00')]; // mardi matin
    }

    public function testCreneauxDuneMatinee(): void
    {
        $now = new \DateTimeImmutable('2026-11-09 10:00', $this->tz); // lundi
        $day = new \DateTimeImmutable('2026-11-10', $this->tz);       // mardi
        $slots = (new CreneauCalculator())->creneauxDuJour($day, 120, 0, $this->hours, [], $this->rules, $now, $this->tz);

        self::assertSame(['10:00'], array_map(fn (TimeRange $s) => $s->start->setTimezone($this->tz)->format('H:i'), $slots));
    }

    public function testPasDeReservationLeJourMeme(): void
    {
        $now = new \DateTimeImmutable('2026-11-10 07:00', $this->tz);
        $day = new \DateTimeImmutable('2026-11-10', $this->tz);
        self::assertSame([], (new CreneauCalculator())->creneauxDuJour($day, 60, 0, $this->hours, [], $this->rules, $now, $this->tz));
    }

    public function testTrajetEtOccupationRetirentDesCreneaux(): void
    {
        $now = new \DateTimeImmutable('2026-11-01 10:00', $this->tz);
        $day = new \DateTimeImmutable('2026-11-10', $this->tz);
        $busy = [new TimeRange(new \DateTimeImmutable('2026-11-10 10:00', $this->tz), new \DateTimeImmutable('2026-11-10 11:00', $this->tz))];
        $slots = (new CreneauCalculator())->creneauxDuJour($day, 60, 30, $this->hours, $busy, $this->rules, $now, $this->tz);
        $starts = array_map(fn (TimeRange $s) => $s->start->setTimezone($this->tz)->format('H:i'), $slots);

        self::assertSame(['08:30'], $starts);
    }
}
