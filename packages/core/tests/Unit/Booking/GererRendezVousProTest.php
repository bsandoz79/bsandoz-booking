<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Admin\Application\TableauDeBord;
use Bsandoz\Core\Auth\Application\CreerCompteDepuisReservation;
use Bsandoz\Core\Booking\Application\GererRendezVousPro;
use Bsandoz\Core\Booking\Application\ListerCreneaux;
use Bsandoz\Core\Booking\Application\NotificationsReservation;
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
use Bsandoz\Core\Notification\Domain\Service\IcsGenerator;
use Bsandoz\Core\Payment\Application\ConfirmerPaiement;
use Bsandoz\Core\Payment\Application\CreerSessionAcompte;
use Bsandoz\Core\Payment\Application\RembourserAcompte;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\FakePaymentGateway;
use Bsandoz\Core\Tests\Double\InMemoryAvailabilityRepository;
use Bsandoz\Core\Tests\Double\InMemoryOptionRepository;
use Bsandoz\Core\Tests\Double\InMemoryPaymentRepository;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use Bsandoz\Core\Tests\Double\InMemoryReservationRepository;
use Bsandoz\Core\Tests\Double\InMemoryTokenService;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use Bsandoz\Core\Tests\Double\RecordingNotifier;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

/** Espace pro : planning, statuts, annulation, remboursement, rendez-vous par téléphone, tableau de bord. Horloge au 01/11/2026 10:00 UTC. */
final class GererRendezVousProTest extends TestCase
{
    private FrozenClock $clock;
    private InMemoryReservationRepository $reservations;
    private RecordingNotifier $notifier;
    private FakePaymentGateway $gateway;
    private ReserverCreneau $reserver;
    private CreerSessionAcompte $session;
    private ConfirmerPaiement $confirmer;
    private GererRendezVousPro $pro;
    private TableauDeBord $tableau;

    protected function setUp(): void
    {
        $this->clock = new FrozenClock('2026-11-01 10:00');
        $this->reservations = new InMemoryReservationRepository();
        $this->notifier = new RecordingNotifier();
        $this->gateway = new FakePaymentGateway();
        $payments = new InMemoryPaymentRepository();
        $tokens = new InMemoryTokenService($this->clock);
        $users = new InMemoryUserRepository();
        $settings = new ConfiguredSettingsProvider(
            ['min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 0, 'slot_step_min' => 60, 'free_cancel_hours' => 48, 'deposit_percent' => 30, 'deposit_fixed_cents' => null, 'hold_minutes' => 10],
            null,
            'Europe/Paris',
        );
        $availability = new InMemoryAvailabilityRepository();
        $availability->saveOpeningHour(new OpeningHour(2, '08:00', '12:00'));
        $prestations = new InMemoryPrestationRepository(new Prestation('p', 'Nettoyage', Money::cents(10000), 60));
        $trajet = new Trajet($settings, new ZoneCalculator());
        $occupations = new Occupations($this->reservations, $availability, $trajet, $this->clock);
        $creneaux = new ListerCreneaux($availability, $settings, $prestations, new CreneauCalculator(), $occupations, $trajet, $this->clock);
        $devis = new CalculerDevis($prestations, new InMemoryOptionRepository(), new SansVarianteResolver(), new ZoneCalculator(), $settings, new PrixCalculator());
        $notifications = new NotificationsReservation($this->notifier, $users, $prestations, new IcsGenerator(), 'Marque', 'pro@example.test');
        $rembourser = new RembourserAcompte($payments, $this->gateway);

        $this->reserver = new ReserverCreneau($devis, $creneaux, new CreerCompteDepuisReservation($users, $tokens, $this->notifier, new SequenceIdGenerator('u'), $this->clock), $this->reservations, $settings, $tokens, $notifications, new SequenceIdGenerator('r'), $this->clock);
        $this->session = new CreerSessionAcompte($this->reservations, $users, $prestations, $this->gateway, $payments, new SequenceIdGenerator('pay'), $this->clock, 'https://site.test/ok', 'https://site.test/ko');
        $this->confirmer = new ConfirmerPaiement($this->gateway, $payments, $this->reservations, $occupations, $tokens, $notifications, $this->clock);
        $this->pro = new GererRendezVousPro($this->reservations, $users, $prestations, $this->reserver, $this->session, $rembourser, $notifications, $this->clock);
        $this->tableau = new \Bsandoz\Core\Admin\Application\TableauDeBord($this->reservations, $settings, $this->clock);
    }

    private static function commande(string $heure = '09:00', string $email = 'camille@example.test'): ReserverCreneauCommand
    {
        return new ReserverCreneauCommand('p', [], [], new \DateTimeImmutable('2026-11-10 ' . $heure, new \DateTimeZone('Europe/Paris')), '', null, null, $email, 'Camille', 'Martin', '0600000000', '', true);
    }

    /** Réservation en ligne payée : confirmée. */
    private function reservationPayee(string $heure = '09:00'): string
    {
        $id = ($this->reserver)(self::commande($heure))->reservationId;
        ($this->session)($id);
        ($this->confirmer)(FakePaymentGateway::sessionReglee(sprintf('cs_test_%d', count($this->gateway->checkouts))), FakePaymentGateway::SIGNATURE);

        return $id;
    }

    public function testPlanningAvecLeClient(): void
    {
        $id = $this->reservationPayee();
        $abandon = ($this->reserver)(self::commande('11:00', 'autre@example.test'))->reservationId;
        $r = $this->reservations->get($abandon);
        $r->expire();
        $this->reservations->save($r);

        $planning = $this->pro->planning(new \DateTimeImmutable('2026-11-09'), new \DateTimeImmutable('2026-11-12'));

        self::assertCount(1, $planning, 'les blocages abandonnés n\'apparaissent pas');
        self::assertSame($id, $planning[0]['id']);
        self::assertSame(['name' => 'Camille Martin', 'email' => 'camille@example.test', 'phone' => '0600000000'], $planning[0]['client']);
        self::assertSame('Nettoyage', $planning[0]['prestation']);
        self::assertSame('confirmed', $planning[0]['status']);
        self::assertSame($this->clock->now()->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM), $planning[0]['createdAt'], 'date de prise du rendez-vous');
    }

    public function testMarquerFaitOuAbsentApresLeDebut(): void
    {
        $id = $this->reservationPayee();
        $this->clock->set('2026-11-10 09:00');

        $this->pro->changerStatut($id, 'done');
        self::assertSame(ReservationStatus::Done, $this->reservations->get($id)->status());

        $this->pro->changerStatut($id, 'no_show');
        self::assertSame(ReservationStatus::NoShow, $this->reservations->get($id)->status(), 'correction possible');
    }

    public function testPasDeStatutAvantLeRendezVous(): void
    {
        $id = $this->reservationPayee();

        $this->expectException(DomainError::class);
        $this->pro->changerStatut($id, 'done');
    }

    public function testStatutInconnu(): void
    {
        $id = $this->reservationPayee();

        $this->expectException(DomainError::class);
        $this->pro->changerStatut($id, 'paye');
    }

    public function testAnnulationParLeProAvecRemboursement(): void
    {
        $id = $this->reservationPayee();
        $this->clock->set('2026-11-09 20:00'); // tard : le pro choisit quand même de rembourser

        self::assertSame(3000, $this->pro->annuler($id, true)->cents);
        self::assertSame(ReservationStatus::Cancelled, $this->reservations->get($id)->status());
        self::assertTrue($this->notifier->of('booking_cancelled')[0]['context']['refundable']);
    }

    public function testAnnulationParLeProSansRemboursement(): void
    {
        $id = $this->reservationPayee();

        self::assertSame(0, $this->pro->annuler($id, false)->cents);
        self::assertSame([], $this->gateway->refunds);
    }

    public function testRemboursementPartiel(): void
    {
        $id = $this->reservationPayee();

        self::assertSame(1000, $this->pro->rembourser($id, 1000)->cents);
        self::assertSame([['sessionId' => 'cs_test_1', 'amount' => 1000]], $this->gateway->refunds);
    }

    public function testRendezVousParTelephoneConfirmeTouteDeSuite(): void
    {
        $resultat = $this->pro->ajouterParTelephone(self::commande(), false);

        self::assertSame('confirmed', $resultat['status']);
        self::assertNull($resultat['paymentUrl']);
        self::assertCount(1, $this->notifier->of('booking_confirmed'));
        self::assertCount(1, $this->notifier->of('pro_new_booking'));
    }

    public function testRendezVousParTelephoneAvecLienDAcompte(): void
    {
        $resultat = $this->pro->ajouterParTelephone(self::commande(), true);

        self::assertSame('pending_payment', $resultat['status']);
        self::assertSame('https://paiement.test/cs_test_1', $resultat['paymentUrl']);
        $mail = $this->notifier->of('deposit_link')[0];
        self::assertSame('camille@example.test', $mail['to']);
        self::assertSame('https://paiement.test/cs_test_1', $mail['context']['paymentUrl']);
    }

    public function testTableauDeBord(): void
    {
        $this->reservationPayee('09:00');
        $annule = $this->reservationPayee('10:00');
        $this->pro->annuler($annule, false);
        ($this->reserver)(self::commande('11:00', 'attente@example.test'));

        $tableau = ($this->tableau)();

        self::assertSame(1, $tableau['monthBookings']);
        self::assertSame(10000, $tableau['monthRevenueCents']);
        self::assertSame(1, $tableau['pendingPayments']);
        self::assertSame(0.5, $tableau['monthCancellationRate']);
        self::assertCount(1, $tableau['next']);
        self::assertSame(0, $tableau['today']);
    }
}
