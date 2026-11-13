<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Service\CreneauCalculator;
use Bsandoz\Core\Shared\Domain\TimeRange;
use PHPUnit\Framework\TestCase;

/**
 * Prestations à durée incertaine : elles occupent toute la plage d'ouverture (demi-journée).
 * Mardi 10/11/2026, ouvert 08:00–12:00 et 14:00–18:00.
 */
final class CreneauOccupePlageTest extends TestCase
{
    private \DateTimeZone $tz;
    private BookingRules $rules;
    /** @var list<OpeningHour> */
    private array $hours;
    private CreneauCalculator $calculator;

    protected function setUp(): void
    {
        $this->tz = new \DateTimeZone('Europe/Paris');
        $this->rules = new BookingRules(minNoticeHours: 24, bufferMin: 15, slotStepMin: 30);
        $this->hours = [new OpeningHour(2, '08:00', '12:00'), new OpeningHour(2, '14:00', '18:00')];
        $this->calculator = new CreneauCalculator();
    }

    private function at(string $datetime): \DateTimeImmutable
    {
        return new \DateTimeImmutable($datetime, $this->tz);
    }

    /**
     * @param list<TimeRange> $busy
     * @return list<TimeRange>
     */
    private function slots(int $duration, int $travel = 0, array $busy = [], bool $occupePlage = true, string $now = '2026-11-01 10:00'): array
    {
        return $this->calculator->creneauxDuJour($this->at('2026-11-10'), $duration, $travel, $this->hours, $busy, $this->rules, $this->at($now), $this->tz, $occupePlage);
    }

    /**
     * @param list<TimeRange> $slots
     * @return list<string> « début–fin » en heure locale
     */
    private function format(array $slots): array
    {
        return array_map(fn (TimeRange $s): string => $s->start->setTimezone($this->tz)->format('H:i') . '–' . $s->end->setTimezone($this->tz)->format('H:i'), $slots);
    }

    public function testUnSeulCreneauParDemiJourneeJusquALaFermeture(): void
    {
        self::assertSame(['08:00–12:00', '14:00–18:00'], $this->format($this->slots(150)));
    }

    public function testLeTrajetSeFaitAvantLOuverture(): void
    {
        self::assertSame(['08:00–12:00', '14:00–18:00'], $this->format($this->slots(150, 30)));
    }

    public function testUnPetitRendezVousLeMatinLaisseSeulementLApresMidi(): void
    {
        $busy = [new TimeRange($this->at('2026-11-10 08:00'), $this->at('2026-11-10 09:00'))];

        self::assertSame(['14:00–18:00'], $this->format($this->slots(150, busy: $busy)));
    }

    public function testUneOccupationJusteAvantLOuvertureNeGenePas(): void
    {
        $busy = [new TimeRange($this->at('2026-11-10 07:00'), $this->at('2026-11-10 08:00'))];

        self::assertSame(['08:00–12:00', '14:00–18:00'], $this->format($this->slots(150, busy: $busy)));
    }

    public function testDureeEstimeePlusLongueQueLaDemiJournee(): void
    {
        self::assertSame([], $this->slots(300));
    }

    public function testDelaiMinimum(): void
    {
        // Maintenant lundi 09:00 + 24 h : le mardi matin (08:00) est trop tôt.
        self::assertSame(['14:00–18:00'], $this->format($this->slots(150, now: '2026-11-09 09:00')));
    }

    public function testUneDemiJourneeReserveeBloqueLesCreneauxADureeFiable(): void
    {
        // Réservation à durée incertaine prise le matin (trajet compris, jusqu'à la fermeture).
        $matinPris = [new TimeRange($this->at('2026-11-10 08:00'), $this->at('2026-11-10 12:00'))];

        $fiables = $this->format($this->slots(60, busy: $matinPris, occupePlage: false));

        self::assertSame('14:00–15:00', $fiables[0], 'premier créneau fiable : l\'après-midi');
        self::assertNotContains('08:00–09:00', $fiables);
    }

    public function testJoursDisponiblesPourUneDureeIncertaine(): void
    {
        $hours = [new OpeningHour(2, '08:00', '12:00'), new OpeningHour(2, '14:00', '18:00')];
        $busy = [
            new TimeRange($this->at('2026-11-10 08:00'), $this->at('2026-11-10 08:30')), // mardi 10 : matin entamé
            new TimeRange($this->at('2026-11-10 16:00'), $this->at('2026-11-10 17:00')), // et après-midi entamé
        ];

        $days = $this->calculator->joursDisponibles(2026, 11, 150, 0, $hours, $busy, $this->rules, $this->at('2026-11-09 10:00'), $this->tz, true);

        self::assertSame(['2026-11-17', '2026-11-24'], $days, 'le 10 n\'a plus de demi-journée entière libre');
    }
}
