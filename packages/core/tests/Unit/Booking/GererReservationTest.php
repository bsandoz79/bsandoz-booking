<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Auth\Application\CreerCompteDepuisReservation;
use Bsandoz\Core\Booking\Application\AnnulerReservation;
use Bsandoz\Core\Booking\Application\DeplacerReservation;
use Bsandoz\Core\Booking\Application\ExpirerReservationsNonPayees;
use Bsandoz\Core\Booking\Application\ListerCreneaux;
use Bsandoz\Core\Booking\Application\Occupations;
use Bsandoz\Core\Booking\Application\ReserverCreneau;
use Bsandoz\Core\Booking\Application\ReserverCreneauCommand;
use Bsandoz\Core\Booking\Application\NotificationsReservation;
use Bsandoz\Core\Booking\Application\ReservationParJeton;
use Bsandoz\Core\Notification\Domain\Service\IcsGenerator;
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
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryAvailabilityRepository;
use Bsandoz\Core\Tests\Double\InMemoryOptionRepository;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use Bsandoz\Core\Payment\Application\RembourserAcompte;
use Bsandoz\Core\Tests\Double\FakePaymentGateway;
use Bsandoz\Core\Tests\Double\InMemoryPaymentRepository;
use Bsandoz\Core\Tests\Double\InMemoryReservationRepository;
use Bsandoz\Core\Tests\Double\InMemoryTokenService;
use Bsandoz\Core\Tests\Double\RecordingNotifier;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

/** Annuler, déplacer, expirer. Horloge au 01/11/2026 10:00 UTC ; mardis ouverts 08:00–12:00 (Paris). */
final class GererReservationTest extends TestCase
{
    private InMemoryReservationRepository $reservations;
    private FrozenClock $clock;
    private ReserverCreneau $reserver;
    private AnnulerReservation $annuler;
    private DeplacerReservation $deplacer;
    private ExpirerReservationsNonPayees $expirer;
    private InMemoryTokenService $tokens;
    private ReservationParJeton $parJeton;
    private RecordingNotifier $notifier;

    protected function setUp(): void
    {
        $this->reservations = new InMemoryReservationRepository();
        $this->clock = new FrozenClock('2026-11-01 10:00');
        $this->tokens = new InMemoryTokenService($this->clock);
        $this->construire(depositPercent: 0);
    }

    private function construire(int $depositPercent): void
    {
        $settings = new ConfiguredSettingsProvider(
            [
                'min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 0, 'slot_step_min' => 60,
                'free_cancel_hours' => 48, 'deposit_percent' => $depositPercent, 'deposit_fixed_cents' => null, 'hold_minutes' => 10,
            ],
            ['origin_lat' => 45.0, 'origin_lng' => 5.0, 'free_radius_km' => 15.0, 'price_per_km_cents' => 50, 'max_distance_km' => 60.0, 'road_factor' => 1.3, 'average_speed_kmh' => 50.0],
            'Europe/Paris',
        );
        $availability = new InMemoryAvailabilityRepository();
        $availability->saveOpeningHour(new OpeningHour(2, '08:00', '12:00'));
        $prestations = new InMemoryPrestationRepository(new Prestation('p', 'Prestation', Money::cents(10000), 60));
        $zone = new ZoneCalculator();
        $trajet = new Trajet($settings, $zone);
        $creneaux = new ListerCreneaux($availability, $settings, $prestations, new CreneauCalculator(), new Occupations($this->reservations, $availability, $trajet, $this->clock), $trajet, $this->clock);
        $devis = new CalculerDevis($prestations, new InMemoryOptionRepository(), new SansVarianteResolver(), $zone, $settings, new PrixCalculator());

        $users = new InMemoryUserRepository();
        $this->notifier = new RecordingNotifier();
        $notifications = new NotificationsReservation($this->notifier, $users, $prestations, new IcsGenerator(), 'Marque', 'pro@example.test');

        $this->reserver = new ReserverCreneau($devis, $creneaux, new CreerCompteDepuisReservation($users, $this->tokens, $this->notifier, new SequenceIdGenerator('u'), $this->clock), $this->reservations, $settings, $this->tokens, $notifications, new SequenceIdGenerator('r'), $this->clock);
        $this->parJeton = new ReservationParJeton($this->tokens, $this->reservations);
        $this->annuler = new AnnulerReservation($this->reservations, $settings, new RembourserAcompte(new InMemoryPaymentRepository(), new FakePaymentGateway()), $notifications, $this->clock);
        $this->deplacer = new DeplacerReservation($this->reservations, $creneaux, $devis, $settings, $notifications, $this->clock);
        $this->expirer = new ExpirerReservationsNonPayees($this->reservations, $this->clock);
    }

    private static function paris(string $datetime): \DateTimeImmutable
    {
        return new \DateTimeImmutable($datetime, new \DateTimeZone('Europe/Paris'));
    }

    private function reserver(string $start, string $email = 'camille@example.test'): string
    {
        return $this->reserverAvecJeton($start, $email)->reservationId;
    }

    private function reserverAvecJeton(string $start, string $email = 'camille@example.test'): \Bsandoz\Core\Booking\Application\ReservationCreee
    {
        return ($this->reserver)(new ReserverCreneauCommand('p', [], [], self::paris($start), 'adresse', 45.0, 5.0, $email, 'Camille', 'Martin', '0600000000', '', true));
    }

    public function testLeLienDeGestionRetrouveLaReservationJusquALaFinDuRendezVous(): void
    {
        $creee = $this->reserverAvecJeton('2026-11-10 09:00');

        self::assertSame($creee->reservationId, ($this->parJeton)($creee->manageToken)->id());
        self::assertSame($creee->reservationId, ($this->parJeton)($creee->manageToken)->id(), 'réutilisable');

        $this->clock->set('2026-11-10 09:00'); // 10:00 à Paris, fin du rendez-vous
        $this->expectException(NotFound::class);
        ($this->parJeton)($creee->manageToken);
    }

    public function testLienDeGestionInconnu(): void
    {
        $this->expectException(NotFound::class);
        ($this->parJeton)('manage-999');
    }

    public function testAnnulationDepuisLeLienDeGestion(): void
    {
        $creee = $this->reserverAvecJeton('2026-11-10 09:00');
        $reservation = ($this->parJeton)($creee->manageToken);

        ($this->annuler)($reservation->id(), $reservation->userId());

        self::assertSame(ReservationStatus::Cancelled, $this->reservations->get($creee->reservationId)->status());
    }

    public function testAnnulationGratuiteEtCreneauLibere(): void
    {
        $id = $this->reserver('2026-11-10 09:00');

        self::assertTrue(($this->annuler)($id, 'u-1'), 'plus de 48 h avant : acompte remboursable');
        self::assertSame(ReservationStatus::Cancelled, $this->reservations->get($id)->status());
        self::assertSame('r-2', $this->reserver('2026-11-10 09:00', 'autre@example.test'), 'le créneau est de nouveau réservable');
    }

    public function testMailsDeConfirmationSansAcompte(): void
    {
        $this->reserver('2026-11-10 09:00');

        $client = $this->notifier->of('booking_confirmed');
        self::assertCount(1, $client);
        self::assertSame('camille@example.test', $client[0]['to']);
        self::assertSame('2026-11-10T08:00:00+00:00', $client[0]['context']['start']);
        self::assertSame('Prestation', $client[0]['context']['prestation']);
        self::assertIsString($client[0]['context']['manageToken']);
        self::assertSame('rendez-vous.ics', $client[0]['attachments'][0]['name']);
        self::assertStringContainsString('DTSTART:20261110T080000Z', $client[0]['attachments'][0]['content']);

        $pro = $this->notifier->of('pro_new_booking');
        self::assertCount(1, $pro);
        self::assertSame('pro@example.test', $pro[0]['to']);
        self::assertSame('Camille Martin', $pro[0]['context']['client']);
        self::assertSame('0600000000', $pro[0]['context']['phone']);
    }

    public function testMailsDAnnulation(): void
    {
        $id = $this->reserver('2026-11-10 09:00');
        ($this->annuler)($id, 'u-1');

        self::assertTrue($this->notifier->of('booking_cancelled')[0]['context']['refundable']);
        self::assertSame('pro@example.test', $this->notifier->of('pro_booking_cancelled')[0]['to']);
    }

    public function testMailsDeDeplacement(): void
    {
        $id = $this->reserver('2026-11-10 09:00');
        ($this->deplacer)($id, self::paris('2026-11-17 10:00'), 'u-1');

        $client = $this->notifier->of('booking_moved')[0];
        self::assertSame('2026-11-17T09:00:00+00:00', $client['context']['start']);
        self::assertSame('2026-11-10T08:00:00+00:00', $client['context']['previousStart']);
        self::assertStringContainsString('DTSTART:20261117T090000Z', $client['attachments'][0]['content'], '.ics à jour');
        self::assertCount(1, $this->notifier->of('pro_booking_moved'));
    }

    public function testAnnulationTardiveSansRemboursement(): void
    {
        $id = $this->reserver('2026-11-10 09:00');
        $this->clock->set('2026-11-09 08:00');

        self::assertFalse(($this->annuler)($id, 'u-1'));
    }

    public function testUnAutreClientNePeutPasAnnuler(): void
    {
        $id = $this->reserver('2026-11-10 09:00');

        $this->expectException(NotFound::class);
        ($this->annuler)($id, 'u-autre');
    }

    public function testDeplacementVersUnCreneauLibre(): void
    {
        $id = $this->reserver('2026-11-10 09:00');

        ($this->deplacer)($id, self::paris('2026-11-17 10:00'), 'u-1');

        $period = $this->reservations->get($id)->period();
        self::assertSame('2026-11-17 10:00', $period->start->setTimezone(new \DateTimeZone('Europe/Paris'))->format('Y-m-d H:i'));
        self::assertSame(60, $period->minutes());
        self::assertSame(2, $this->reservations->locks, 'réservation puis déplacement sous verrou');
    }

    public function testDeplacementQuiChevaucheSonPropreCreneau(): void
    {
        // 10:00–11:00 → 09:00–10:00 : le créneau actuel ne doit pas bloquer son propre déplacement.
        $id = $this->reserver('2026-11-10 10:00');

        ($this->deplacer)($id, self::paris('2026-11-10 09:00'), 'u-1');

        self::assertSame('09:00', $this->reservations->get($id)->period()->start->setTimezone(new \DateTimeZone('Europe/Paris'))->format('H:i'));
    }

    public function testDeplacementVersUnCreneauPris(): void
    {
        $this->reserver('2026-11-17 10:00', 'autre@example.test');
        $id = $this->reserver('2026-11-10 09:00');

        $this->expectException(DomainError::class);
        ($this->deplacer)($id, self::paris('2026-11-17 10:00'), 'u-1');
    }

    public function testUnAutreClientNePeutPasDeplacer(): void
    {
        $id = $this->reserver('2026-11-10 09:00');

        $this->expectException(NotFound::class);
        ($this->deplacer)($id, self::paris('2026-11-17 10:00'), 'u-autre');
    }

    public function testExpirationDesBlocagesDepasses(): void
    {
        $this->construire(depositPercent: 30);
        $id = $this->reserver('2026-11-10 09:00');

        self::assertSame(0, ($this->expirer)(), 'blocage encore en cours');

        $this->clock->modify('+10 minutes');
        self::assertSame(1, ($this->expirer)());
        self::assertSame(ReservationStatus::Expired, $this->reservations->get($id)->status());
        self::assertSame(0, ($this->expirer)(), 'rien à refaire');
    }
}
