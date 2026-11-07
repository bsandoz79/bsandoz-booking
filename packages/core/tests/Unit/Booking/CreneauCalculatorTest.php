<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Service\CreneauCalculator;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\TimeRange;
use PHPUnit\Framework\TestCase;

/**
 * Repères : le 10/11/2026 est un mardi (2), le 12 un jeudi (4), le 8 un dimanche (7).
 * Fuseau Europe/Paris ; passage à l'heure d'hiver le dimanche 25/10/2026.
 */
final class CreneauCalculatorTest extends TestCase
{
    private \DateTimeZone $tz;
    private BookingRules $rules;
    /** @var list<OpeningHour> */
    private array $hours;
    private CreneauCalculator $calculator;

    protected function setUp(): void
    {
        $this->tz = new \DateTimeZone('Europe/Paris');
        $this->rules = new BookingRules(minNoticeHours: 24, horizonDays: 60, bufferMin: 0, slotStepMin: 60);
        $this->hours = [new OpeningHour(2, '08:00', '12:00')]; // mardi matin
        $this->calculator = new CreneauCalculator();
    }

    private function at(string $datetime): \DateTimeImmutable
    {
        return new \DateTimeImmutable($datetime, $this->tz);
    }

    private function busy(string $start, string $end): TimeRange
    {
        return new TimeRange($this->at($start), $this->at($end));
    }

    /**
     * Heures locales de début des créneaux du jour.
     *
     * @param list<OpeningHour>|null $hours
     * @param list<TimeRange> $busy
     * @return list<string>
     */
    private function starts(
        string $day,
        int $duration,
        int $travel = 0,
        ?array $hours = null,
        array $busy = [],
        ?BookingRules $rules = null,
        string $now = '2026-11-01 10:00',
    ): array {
        $slots = $this->calculator->creneauxDuJour($this->at($day), $duration, $travel, $hours ?? $this->hours, $busy, $rules ?? $this->rules, $this->at($now), $this->tz);

        return array_map(fn (TimeRange $s): string => $s->start->setTimezone($this->tz)->format('H:i'), $slots);
    }

    public function testCreneauxDuneMatinee(): void
    {
        self::assertSame(['10:00'], $this->starts('2026-11-10', 120, now: '2026-11-09 10:00'));
    }

    public function testPasDeReservationLeJourMeme(): void
    {
        self::assertSame([], $this->starts('2026-11-10', 60, now: '2026-11-10 07:00'));
    }

    public function testTrajetEtOccupationRetirentDesCreneaux(): void
    {
        self::assertSame(['08:30'], $this->starts('2026-11-10', 60, 30, busy: [$this->busy('2026-11-10 10:00', '2026-11-10 11:00')]));
    }

    public function testChaqueCreneauDureLeTempsDeLaPrestation(): void
    {
        $slots = $this->calculator->creneauxDuJour($this->at('2026-11-10'), 90, 0, $this->hours, [], $this->rules, $this->at('2026-11-01 10:00'), $this->tz);

        self::assertNotEmpty($slots);
        foreach ($slots as $slot) {
            self::assertSame(90, $slot->minutes());
        }
    }

    public function testPasDeTrenteMinutes(): void
    {
        $rules = new BookingRules(bufferMin: 0, slotStepMin: 30);

        self::assertSame(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'], $this->starts('2026-11-10', 60, rules: $rules));
    }

    public function testLaPrestationFinitAvantLaFermetureMaisLeTamponPeutDepasser(): void
    {
        $rules = new BookingRules(bufferMin: 30, slotStepMin: 60);

        // 10:00 → 12:00 tient ; le tampon (12:00 → 12:30) peut déborder après la fermeture.
        self::assertSame(['08:00', '09:00', '10:00'], $this->starts('2026-11-10', 120, rules: $rules));
    }

    public function testPrestationTropLonguePourLaPlage(): void
    {
        self::assertSame([], $this->starts('2026-11-10', 300));
    }

    public function testLeTamponProtegeLaReservationSuivante(): void
    {
        $rules = new BookingRules(bufferMin: 15, slotStepMin: 30);
        $busy = [$this->busy('2026-11-10 10:00', '2026-11-10 11:00')];

        // 09:00 finirait à 10:00 + 15 min de tampon : chevauche. 08:30 finit à 09:30 + 15 min : libre.
        self::assertSame(['08:00', '08:30', '11:00'], $this->starts('2026-11-10', 60, busy: $busy, rules: $rules));
    }

    public function testLeTrajetDoitEtreLibreAvantLeCreneau(): void
    {
        $rules = new BookingRules(bufferMin: 0, slotStepMin: 30);
        $busy = [$this->busy('2026-11-10 08:00', '2026-11-10 09:00')];

        // 09:00 demanderait de partir à 08:30, pendant l'occupation ; 09:30 part à 09:00 pile.
        self::assertSame(['09:30', '10:00', '10:30', '11:00'], $this->starts('2026-11-10', 60, 30, busy: $busy, rules: $rules));
    }

    public function testUnCongeSurToutLeJourNeLaisseAucunCreneau(): void
    {
        self::assertSame([], $this->starts('2026-11-10', 60, busy: [$this->busy('2026-11-09 00:00', '2026-11-11 00:00')]));
    }

    public function testPlusieursPlagesLeMemeJourTriees(): void
    {
        $hours = [new OpeningHour(2, '14:00', '16:00'), new OpeningHour(2, '08:00', '10:00')];

        self::assertSame(['08:00', '09:00', '14:00', '15:00'], $this->starts('2026-11-10', 60, hours: $hours));
    }

    public function testPlagesQuiSeChevauchentSansDoublon(): void
    {
        $hours = [new OpeningHour(2, '08:00', '11:00'), new OpeningHour(2, '10:00', '12:00')];

        self::assertSame(['08:00', '09:00', '10:00', '11:00'], $this->starts('2026-11-10', 60, hours: $hours));
    }

    public function testJourFerme(): void
    {
        self::assertSame([], $this->starts('2026-11-11', 60)); // mercredi
    }

    public function testDelaiMinimumExact(): void
    {
        // Maintenant lundi 10:00, 24 h de délai : mardi 10:00 est le premier créneau possible.
        self::assertSame(['10:00', '11:00'], $this->starts('2026-11-10', 60, now: '2026-11-09 10:00'));
    }

    public function testHorizonDeReservation(): void
    {
        $rules = new BookingRules(bufferMin: 0, slotStepMin: 60, horizonDays: 7);
        $hours = [new OpeningHour(7, '08:00', '12:00')]; // dimanche

        // Maintenant dimanche 01/11 10:00 + 7 jours = dimanche 08/11 10:00, dernier départ possible.
        self::assertSame(['08:00', '09:00', '10:00'], $this->starts('2026-11-08', 60, hours: $hours, rules: $rules));
        self::assertSame([], $this->starts('2026-11-15', 60, hours: $hours, rules: $rules));
    }

    public function testHeuresLocalesConvertiesEnInstantsUtcAutourDuChangementDHeure(): void
    {
        $hours = [new OpeningHour(7, '08:00', '09:00')];
        $rules = new BookingRules(bufferMin: 0, slotStepMin: 60, minNoticeHours: 0);
        $utc = static fn (array $slots): array => array_map(static fn (TimeRange $s): string => $s->start->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i'), $slots);

        $ete = $this->calculator->creneauxDuJour($this->at('2026-10-18'), 60, 0, $hours, [], $rules, $this->at('2026-10-01 00:00'), $this->tz);
        $hiver = $this->calculator->creneauxDuJour($this->at('2026-10-25'), 60, 0, $hours, [], $rules, $this->at('2026-10-01 00:00'), $this->tz);

        self::assertSame(['2026-10-18 06:00'], $utc($ete), 'heure d\'été : UTC+2');
        self::assertSame(['2026-10-25 07:00'], $utc($hiver), 'jour du passage à l\'heure d\'hiver : UTC+1');
    }

    public function testOccupationsExprimeesDansUnAutreFuseau(): void
    {
        // 09:00 UTC = 10:00 à Paris en novembre : le créneau de 10:00 est pris.
        $busy = [new TimeRange(new \DateTimeImmutable('2026-11-10 09:00', new \DateTimeZone('UTC')), new \DateTimeImmutable('2026-11-10 10:00', new \DateTimeZone('UTC')))];

        self::assertSame(['08:00', '09:00', '11:00'], $this->starts('2026-11-10', 60, busy: $busy));
    }

    public function testDureeInvalide(): void
    {
        $this->expectException(DomainError::class);
        $this->starts('2026-11-10', 0);
    }

    public function testTrajetNegatif(): void
    {
        $this->expectException(DomainError::class);
        $this->starts('2026-11-10', 60, -10);
    }

    public function testJoursDisponiblesDuMois(): void
    {
        $hours = [new OpeningHour(2, '08:00', '12:00'), new OpeningHour(4, '08:00', '12:00')]; // mardi et jeudi
        $busy = [$this->busy('2026-11-12 08:00', '2026-11-12 12:00')]; // jeudi 12 complet

        $days = $this->calculator->joursDisponibles(2026, 11, 60, 0, $hours, $busy, $this->rules, $this->at('2026-11-09 10:00'), $this->tz);

        self::assertSame(['2026-11-10', '2026-11-17', '2026-11-19', '2026-11-24', '2026-11-26'], $days);
    }

    public function testJoursDisponiblesLimitesParLHorizon(): void
    {
        $hours = [new OpeningHour(2, '08:00', '12:00'), new OpeningHour(4, '08:00', '12:00')];
        $rules = new BookingRules(bufferMin: 0, slotStepMin: 60, horizonDays: 9);

        // Lundi 09/11 10:00 + 9 jours = mercredi 18/11 10:00.
        $days = $this->calculator->joursDisponibles(2026, 11, 60, 0, $hours, [], $rules, $this->at('2026-11-09 10:00'), $this->tz);

        self::assertSame(['2026-11-10', '2026-11-12', '2026-11-17'], $days);
    }

    public function testAucunJourSansHoraires(): void
    {
        self::assertSame([], $this->calculator->joursDisponibles(2026, 11, 60, 0, [], [], $this->rules, $this->at('2026-11-01 10:00'), $this->tz));
    }
}
