<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Application\ListerCreneaux;
use Bsandoz\Core\Booking\Application\ListerJoursDisponibles;
use Bsandoz\Core\Booking\Application\Occupations;
use Bsandoz\Core\Booking\Application\Trajet;
use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\Unavailability;
use Bsandoz\Core\Booking\Domain\Service\CreneauCalculator;
use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Booking\Infrastructure\Settings\ConfiguredSettingsProvider;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryAvailabilityRepository;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use Bsandoz\Core\Tests\Double\InMemoryReservationRepository;
use PHPUnit\Framework\TestCase;

/**
 * Cas d'usage ListerCreneaux / ListerJoursDisponibles.
 * Zone fictive en (45 ; 5) : à 0,2° de latitude, 28,9 km et 35 min de trajet. Mardi 10/11/2026, ouvert 08:00–12:00 et 14:00–18:00.
 */
final class ListerCreneauxTest extends TestCase
{
    private const LAT = 45.0;
    private const LNG = 5.0;

    private InMemoryReservationRepository $reservations;
    private InMemoryAvailabilityRepository $availability;
    private FrozenClock $clock;

    protected function setUp(): void
    {
        $this->reservations = new InMemoryReservationRepository();
        $this->availability = new InMemoryAvailabilityRepository();
        $this->availability->saveOpeningHour(new OpeningHour(2, '08:00', '12:00'));
        $this->availability->saveOpeningHour(new OpeningHour(2, '14:00', '18:00'));
        $this->clock = new FrozenClock('2026-11-01 10:00');
    }

    /** @return array{ListerCreneaux, ListerJoursDisponibles} */
    private function useCases(bool $surPlace = false): array
    {
        $settings = new ConfiguredSettingsProvider(
            [
                'min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 0, 'slot_step_min' => 30,
                'free_cancel_hours' => 48, 'deposit_percent' => 30, 'deposit_fixed_cents' => null, 'hold_minutes' => 10,
            ],
            $surPlace ? null : [
                'origin_lat' => self::LAT, 'origin_lng' => self::LNG, 'free_radius_km' => 15.0,
                'price_per_km_cents' => 50, 'max_distance_km' => 60.0, 'road_factor' => 1.3, 'average_speed_kmh' => 50.0,
            ],
            'Europe/Paris',
        );
        $prestations = new InMemoryPrestationRepository(
            new Prestation('fiable', 'Durée fiable', Money::cents(5000), 60),
            new Prestation('incertaine', 'Durée incertaine', Money::cents(9000), 150, occupePlage: true),
        );
        $trajet = new Trajet($settings, new ZoneCalculator());
        $occupations = new Occupations($this->reservations, $this->availability, $trajet, $this->clock);
        $calculator = new CreneauCalculator();

        return [
            new ListerCreneaux($this->availability, $settings, $prestations, $calculator, $occupations, $trajet, $this->clock),
            new ListerJoursDisponibles($this->availability, $settings, $prestations, $calculator, $occupations, $trajet, $this->clock),
        ];
    }

    /**
     * @param list<TimeRange> $slots
     * @return list<string> heures locales de début
     */
    private static function starts(array $slots): array
    {
        $paris = new \DateTimeZone('Europe/Paris');

        return array_map(static fn (TimeRange $s): string => $s->start->setTimezone($paris)->format('H:i'), $slots);
    }

    private function reservation(string $id, string $start, string $end, float $lat = self::LAT, float $lng = self::LNG): Reservation
    {
        $paris = new \DateTimeZone('Europe/Paris');

        return new Reservation(
            $id, 'u-1', 'fiable', null, [],
            new TimeRange(new \DateTimeImmutable($start, $paris), new \DateTimeImmutable($end, $paris)),
            'adresse', $lat, $lng, Money::cents(5000), Money::zero(), Money::zero(),
        );
    }

    public function testCreneauxEnUtcAvecTrajet(): void
    {
        [$lister] = $this->useCases();
        $slots = $lister('2026-11-10', 60, self::LAT + 0.2, self::LNG);

        self::assertSame('08:35', self::starts($slots)[0], 'ouverture + 35 min de trajet');
        self::assertSame('UTC', $slots[0]->start->getTimezone()->getName());
        self::assertSame('2026-11-10T07:35:00+00:00', $slots[0]->start->format(DATE_ATOM));
    }

    public function testActiviteSurPlaceSansAdresse(): void
    {
        [$lister] = $this->useCases(surPlace: true);

        self::assertSame('08:00', self::starts($lister('2026-11-10', 60, null, null))[0]);
    }

    public function testAdresseObligatoireADomicile(): void
    {
        [$lister] = $this->useCases();

        $this->expectException(DomainError::class);
        $lister('2026-11-10', 60, null, null);
    }

    public function testAdresseHorsZone(): void
    {
        [$lister] = $this->useCases();

        $this->expectException(DomainError::class);
        $lister('2026-11-10', 60, self::LAT + 1.0, self::LNG);
    }

    public function testDateInvalide(): void
    {
        [$lister] = $this->useCases();

        $this->expectException(DomainError::class);
        $lister('2026-02-30', 60, self::LAT, self::LNG);
    }

    public function testUneReservationBloqueAussiSonTrajetAller(): void
    {
        // Rendez-vous 10:00–11:00 à 35 min de route : le pro part à 09:25.
        $r = $this->reservation('r-1', '2026-11-10 10:00', '2026-11-10 11:00', self::LAT + 0.2);
        $r->confirm();
        $this->reservations->save($r);

        [$lister] = $this->useCases();
        $matin = array_values(array_filter(self::starts($lister('2026-11-10', 60, self::LAT, self::LNG)), static fn (string $h): bool => $h < '12:00'));

        self::assertSame(['08:00', '11:00'], $matin, '08:30 finirait à 09:30, après le départ de 09:25');
    }

    public function testBlocageEnAttenteDePaiementExpireNeBloquePlus(): void
    {
        $actif = Reservation::hold($this->reservation('actif', '2026-11-10 08:00', '2026-11-10 09:00'), $this->clock->now(), 10);
        $expire = Reservation::hold($this->reservation('expire', '2026-11-10 14:00', '2026-11-10 15:00'), $this->clock->now()->modify('-1 hour'), 10);
        $this->reservations->save($actif);
        $this->reservations->save($expire);

        [$lister] = $this->useCases();
        $starts = self::starts($lister('2026-11-10', 60, self::LAT, self::LNG));

        self::assertNotContains('08:00', $starts, 'blocage de 10 min en cours');
        self::assertContains('14:00', $starts, 'blocage expiré');
    }

    public function testReservationAnnuleeNeBloquePas(): void
    {
        $r = $this->reservation('r-1', '2026-11-10 08:00', '2026-11-10 09:00');
        $r->expire();
        $this->reservations->save($r);

        [$lister] = $this->useCases();

        self::assertContains('08:00', self::starts($lister('2026-11-10', 60, self::LAT, self::LNG)));
    }

    public function testIndisponibilite(): void
    {
        $paris = new \DateTimeZone('Europe/Paris');
        $this->availability->saveUnavailability(new Unavailability(new TimeRange(new \DateTimeImmutable('2026-11-10 00:00', $paris), new \DateTimeImmutable('2026-11-10 13:00', $paris)), 'Garage'));

        [$lister] = $this->useCases();

        self::assertSame('14:00', self::starts($lister('2026-11-10', 60, self::LAT, self::LNG))[0]);
    }

    public function testPrestationADureeIncertaineEnDemiJournee(): void
    {
        [$lister] = $this->useCases();

        self::assertSame(['08:00', '14:00'], self::starts($lister('2026-11-10', 150, self::LAT, self::LNG, 'incertaine')));
        self::assertCount(8, $lister('2026-11-10', 150, self::LAT, self::LNG, 'fiable'), 'durée fiable : toutes les 30 min, 4 le matin et 4 l\'après-midi');
    }

    public function testPrestationInconnue(): void
    {
        [$lister] = $this->useCases();

        $this->expectException(NotFound::class);
        $lister('2026-11-10', 60, self::LAT, self::LNG, 'inconnue');
    }

    public function testJoursDisponiblesDuMois(): void
    {
        $r = $this->reservation('r-1', '2026-11-17 08:00', '2026-11-17 18:00');
        $r->confirm();
        $this->reservations->save($r);

        [, $jours] = $this->useCases();

        self::assertSame(['2026-11-03', '2026-11-10', '2026-11-24'], $jours('2026-11', 60, self::LAT, self::LNG));
    }

    public function testMoisInvalide(): void
    {
        [, $jours] = $this->useCases();

        $this->expectException(DomainError::class);
        $jours('2026-13', 60, self::LAT, self::LNG);
    }
}
