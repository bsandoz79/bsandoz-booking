<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Auth\Application\CreerCompteDepuisReservation;
use Bsandoz\Core\Booking\Application\ListerCreneaux;
use Bsandoz\Core\Booking\Application\Occupations;
use Bsandoz\Core\Booking\Application\ReserverCreneau;
use Bsandoz\Core\Booking\Application\ReserverCreneauCommand;
use Bsandoz\Core\Booking\Application\Trajet;
use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Service\CreneauCalculator;
use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Booking\Infrastructure\Settings\ConfiguredSettingsProvider;
use Bsandoz\Core\Catalog\Application\CalculerDevis;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Service\PrixCalculator;
use Bsandoz\Core\Catalog\Infrastructure\Variante\SansVarianteResolver;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryAvailabilityRepository;
use Bsandoz\Core\Tests\Double\InMemoryOptionRepository;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use Bsandoz\Core\Tests\Double\InMemoryReservationRepository;
use Bsandoz\Core\Tests\Double\InMemoryTokenService;
use Bsandoz\Core\Tests\Double\RecordingNotifier;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

/**
 * Horloge figée au dimanche 01/11/2026 10:00 UTC ; mardi 10/11 ouvert 08:00–12:00 et 14:00–18:00 (Paris, UTC+1).
 * Adresse au point de départ de la zone : aucun trajet.
 */
final class ReserverCreneauTest extends TestCase
{
    private const LAT = 45.0;
    private const LNG = 5.0;

    private InMemoryReservationRepository $reservations;
    private InMemoryUserRepository $users;
    private FrozenClock $clock;

    protected function setUp(): void
    {
        $this->reservations = new InMemoryReservationRepository();
        $this->users = new InMemoryUserRepository();
        $this->clock = new FrozenClock('2026-11-01 10:00');
    }

    private function reserver(?int $depositPercent = 30, bool $surPlace = false): ReserverCreneau
    {
        $settings = new ConfiguredSettingsProvider(
            [
                'min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 0, 'slot_step_min' => 30,
                'free_cancel_hours' => 48, 'deposit_percent' => $depositPercent, 'deposit_fixed_cents' => null, 'hold_minutes' => 10,
            ],
            $surPlace ? null : [
                'origin_lat' => self::LAT, 'origin_lng' => self::LNG, 'free_radius_km' => 15.0,
                'price_per_km_cents' => 50, 'max_distance_km' => 60.0, 'road_factor' => 1.3, 'average_speed_kmh' => 50.0,
            ],
            'Europe/Paris',
        );
        $availability = new InMemoryAvailabilityRepository();
        $availability->saveOpeningHour(new OpeningHour(2, '08:00', '12:00'));
        $availability->saveOpeningHour(new OpeningHour(2, '14:00', '18:00'));
        $prestations = new InMemoryPrestationRepository(
            new Prestation('fiable', 'Durée fiable', Money::cents(10000), 60),
            new Prestation('incertaine', 'Durée incertaine', Money::cents(20000), 150, occupePlage: true),
        );
        $zoneCalculator = new ZoneCalculator();
        $trajet = new Trajet($settings, $zoneCalculator);
        $creneaux = new ListerCreneaux(
            $availability, $settings, $prestations, new CreneauCalculator(),
            new Occupations($this->reservations, $availability, $trajet, $this->clock), $trajet, $this->clock,
        );
        $devis = new CalculerDevis($prestations, new InMemoryOptionRepository(), new SansVarianteResolver(), $zoneCalculator, $settings, new PrixCalculator());

        return new ReserverCreneau(
            $devis, $creneaux,
            new CreerCompteDepuisReservation($this->users, new InMemoryTokenService($this->clock), new RecordingNotifier(), new SequenceIdGenerator('u'), $this->clock),
            $this->reservations, $settings, new SequenceIdGenerator('r'), $this->clock,
        );
    }

    private static function command(
        string $start = '2026-11-10 09:00',
        string $prestation = 'fiable',
        bool $cgv = true,
        ?float $lat = self::LAT,
        string $address = '1 rue de l\'Exemple',
        string $email = 'camille@example.test',
    ): ReserverCreneauCommand {
        return new ReserverCreneauCommand(
            $prestation, [], [], new \DateTimeImmutable($start, new \DateTimeZone('Europe/Paris')),
            $address, $lat, $lat === null ? null : self::LNG,
            $email, 'Camille', 'Martin', '0600000000', 'Portail bleu', $cgv,
        );
    }

    public function testReservationBloqueeDixMinutesEnAttenteDeLAcompte(): void
    {
        $resultat = ($this->reserver())(self::command());

        self::assertSame('r-1', $resultat->reservationId);
        self::assertSame(ReservationStatus::PendingPayment, $resultat->status);
        self::assertSame(3000, $resultat->deposit->cents);
        self::assertSame(10000, $resultat->total->cents);
        self::assertSame('2026-11-01T10:10:00+00:00', $resultat->holdExpiresAt?->format(DATE_ATOM));

        $r = $this->reservations->get('r-1');
        self::assertSame('u-1', $r->userId());
        self::assertSame('2026-11-10T08:00:00+00:00', $r->period()->start->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM));
        self::assertSame(60, $r->period()->minutes());
        self::assertSame('1 rue de l\'Exemple', $r->address());
        self::assertSame('Portail bleu', $r->notes());
        self::assertSame(1, $this->reservations->locks, 'créée sous le verrou d\'agenda');
        self::assertSame('camille@example.test', $this->users->get('u-1')->email());
    }

    public function testSansAcompteLaReservationEstConfirmee(): void
    {
        $resultat = ($this->reserver(depositPercent: 0))(self::command());

        self::assertSame(ReservationStatus::Confirmed, $resultat->status);
        self::assertNull($resultat->holdExpiresAt);
    }

    public function testLeMemeCreneauNePeutPasEtreReserveDeuxFois(): void
    {
        $reserver = $this->reserver();
        $reserver(self::command());

        $this->expectException(DomainError::class);
        $this->expectExceptionMessage('plus disponible');
        $reserver(self::command(email: 'autre@example.test'));
    }

    public function testLeCreneauSeLibereQuandLeBlocageExpire(): void
    {
        $reserver = $this->reserver();
        $reserver(self::command());
        $this->clock->modify('+10 minutes');

        self::assertSame('r-2', $reserver(self::command(email: 'autre@example.test'))->reservationId);
    }

    public function testHeureQuiNeCorrespondAAucunCreneau(): void
    {
        $this->expectException(DomainError::class);
        ($this->reserver())(self::command('2026-11-10 09:10'));
    }

    public function testDemiJourneePourUnePrestationADureeIncertaine(): void
    {
        ($this->reserver())(self::command('2026-11-10 08:00', 'incertaine'));

        $r = $this->reservations->get('r-1');
        self::assertSame('11:00', $r->period()->end->setTimezone(new \DateTimeZone('UTC'))->format('H:i'), 'bloquée jusqu\'à 12:00 (Paris)');
    }

    public function testDemiJourneeIncertaineHorsDebutDePlageRefusee(): void
    {
        $this->expectException(DomainError::class);
        ($this->reserver())(self::command('2026-11-10 09:00', 'incertaine'));
    }

    public function testConditionsGeneralesObligatoires(): void
    {
        $this->expectException(DomainError::class);
        ($this->reserver())(self::command(cgv: false));
    }

    public function testAdresseObligatoireADomicile(): void
    {
        $this->expectException(DomainError::class);
        ($this->reserver())(self::command(address: ' '));
    }

    public function testAdresseHorsZone(): void
    {
        $this->expectException(DomainError::class);
        ($this->reserver())(self::command(lat: self::LAT + 1.0));
    }

    public function testActiviteSurPlaceSansAdresse(): void
    {
        $resultat = ($this->reserver(surPlace: true))(self::command(lat: null, address: ''));

        self::assertSame(ReservationStatus::PendingPayment, $resultat->status);
        self::assertSame('', $this->reservations->get('r-1')->address());
    }
}
