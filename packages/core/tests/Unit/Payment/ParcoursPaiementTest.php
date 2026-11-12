<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Payment;

use Bsandoz\Core\Auth\Application\CreerCompteDepuisReservation;
use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Booking\Application\AnnulerReservation;
use Bsandoz\Core\Booking\Application\ListerCreneaux;
use Bsandoz\Core\Booking\Application\NotificationsReservation;
use Bsandoz\Core\Booking\Application\Occupations;
use Bsandoz\Core\Notification\Domain\Service\IcsGenerator;
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
use Bsandoz\Core\Payment\Application\ConfirmerPaiement;
use Bsandoz\Core\Payment\Application\CreerSessionAcompte;
use Bsandoz\Core\Payment\Application\RembourserAcompte;
use Bsandoz\Core\Payment\Domain\Model\PaymentStatus;
use Bsandoz\Core\Payment\Domain\SignatureInvalide;
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

/**
 * Réservation → session d'acompte → notification de paiement → confirmation ou remboursement.
 * Horloge au 01/11/2026 10:00 UTC, acompte 30 %, blocage 10 min ; mardis ouverts 08:00–12:00 (Paris), prestation de 60 min à 100 €.
 */
final class ParcoursPaiementTest extends TestCase
{
    private FrozenClock $clock;
    private InMemoryReservationRepository $reservations;
    private InMemoryPaymentRepository $payments;
    private InMemoryTokenService $tokens;
    private RecordingNotifier $notifier;
    private FakePaymentGateway $gateway;
    private ReserverCreneau $reserver;
    private CreerSessionAcompte $session;
    private ConfirmerPaiement $confirmer;
    private AnnulerReservation $annuler;
    private RembourserAcompte $rembourser;
    private \Bsandoz\Core\Payment\Application\ReprendrePaiement $reprendre;
    private \Bsandoz\Core\Booking\Application\DeplacerReservation $deplacer;
    private \Bsandoz\Core\Tests\Double\InMemoryProduitRepository $produits;

    protected function setUp(): void
    {
        $this->clock = new FrozenClock('2026-11-01 10:00');
        $this->reservations = new InMemoryReservationRepository();
        $this->payments = new InMemoryPaymentRepository();
        $this->tokens = new InMemoryTokenService($this->clock);
        $this->notifier = new RecordingNotifier();
        $this->gateway = new FakePaymentGateway();
        $users = new InMemoryUserRepository();
        $this->produits = new \Bsandoz\Core\Tests\Double\InMemoryProduitRepository(new \Bsandoz\Core\Catalog\Domain\Model\Produit('micro', 'Microfibre', Money::cents(600), 5));
        $stock = new \Bsandoz\Core\Catalog\Application\StockProduits($this->produits);

        $settings = new ConfiguredSettingsProvider(
            [
                'min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 0, 'slot_step_min' => 60,
                'free_cancel_hours' => 48, 'deposit_percent' => 30, 'deposit_fixed_cents' => null, 'hold_minutes' => 10,
            ],
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

        $this->reserver = new ReserverCreneau($devis, $creneaux, new CreerCompteDepuisReservation($users, $this->tokens, $this->notifier, new SequenceIdGenerator('u'), $this->clock), $this->reservations, $settings, $this->tokens, $notifications, new SequenceIdGenerator('r'), $this->clock, stock: $stock);
        $this->session = new CreerSessionAcompte($this->reservations, $users, $prestations, $this->gateway, $this->payments, new SequenceIdGenerator('pay'), $this->clock, 'https://site.test/confirmation?reservation={reservationId}', 'https://site.test/reserver?annule={reservationId}');
        $this->confirmer = new ConfirmerPaiement($this->gateway, $this->payments, $this->reservations, $occupations, $this->tokens, $notifications, $this->clock, stock: $stock);
        $this->rembourser = new RembourserAcompte($this->payments, $this->gateway);
        $this->reprendre = new \Bsandoz\Core\Payment\Application\ReprendrePaiement($this->reservations, $creneaux, $devis, $settings, $this->session, $this->clock, stock: $stock);
        $this->deplacer = new \Bsandoz\Core\Booking\Application\DeplacerReservation($this->reservations, $creneaux, $devis, $settings, $notifications, $this->clock);
        $this->annuler = new AnnulerReservation($this->reservations, $settings, $this->rembourser, $notifications, $this->clock, stock: $stock);
    }

    /** @param array<string, int> $produits */
    private function reserver(string $email = 'camille@example.test', string $heure = '09:00', array $produits = []): string
    {
        return ($this->reserver)(new ReserverCreneauCommand(
            'p', [], [], new \DateTimeImmutable('2026-11-10 ' . $heure, new \DateTimeZone('Europe/Paris')),
            '', null, null, $email, 'Camille', 'Martin', '0600000000', '', true, null, $produits,
        ))->reservationId;
    }

    private function payer(string $sessionId, string $eventId = 'evt_1'): void
    {
        ($this->confirmer)(FakePaymentGateway::sessionReglee($sessionId, $eventId), FakePaymentGateway::SIGNATURE);
    }

    public function testSessionDAcompte(): void
    {
        $id = $this->reserver();

        $url = ($this->session)($id);

        self::assertSame('https://paiement.test/cs_test_1', $url);
        self::assertSame([
            'reservationId' => $id, 'amount' => 3000, 'description' => 'Acompte : Nettoyage', 'email' => 'camille@example.test',
            'successUrl' => 'https://site.test/confirmation?reservation=' . $id, 'cancelUrl' => 'https://site.test/reserver?annule=' . $id,
        ], $this->gateway->checkouts[0]);
        self::assertSame(PaymentStatus::Pending, $this->payments->bySessionId('cs_test_1')?->status());
    }

    public function testPaiementConfirmeLaReservationEtEnvoieLeMail(): void
    {
        $id = $this->reserver();
        ($this->session)($id);

        $this->payer('cs_test_1');

        self::assertSame(ReservationStatus::Confirmed, $this->reservations->get($id)->status());
        self::assertSame(PaymentStatus::Paid, $this->payments->bySessionId('cs_test_1')?->status());
        $mails = $this->notifier->of('booking_confirmed');
        self::assertCount(1, $mails);
        self::assertSame('camille@example.test', $mails[0]['to']);
        self::assertSame(3000, $mails[0]['context']['depositCents']);
        $lien = $mails[0]['context']['manageToken'];
        self::assertIsString($lien);
        self::assertSame($id, $this->tokens->verify($lien, TokenType::ManageReservation), 'lien « gérer mon rendez-vous » du mail');
    }

    public function testNotificationRecueDeuxFoisTraiteeUneFois(): void
    {
        $id = $this->reserver();
        ($this->session)($id);

        $this->payer('cs_test_1', 'evt_1');
        $this->payer('cs_test_1', 'evt_1');

        self::assertCount(1, $this->notifier->of('booking_confirmed'));
        self::assertSame([], $this->gateway->refunds);
    }

    public function testSignatureInvalideRefusee(): void
    {
        $id = $this->reserver();
        ($this->session)($id);

        $this->expectException(SignatureInvalide::class);
        ($this->confirmer)(FakePaymentGateway::sessionReglee('cs_test_1'), 'falsifiee');
    }

    public function testAutresNotificationsEtSessionsInconnuesIgnorees(): void
    {
        $id = $this->reserver();
        ($this->session)($id);

        ($this->confirmer)(json_encode(['id' => 'evt_x', 'type' => 'checkout.session.expired', 'session' => 'cs_test_1', 'paid' => false], JSON_THROW_ON_ERROR), FakePaymentGateway::SIGNATURE);
        $this->payer('cs_inconnue');

        self::assertSame(ReservationStatus::PendingPayment, $this->reservations->get($id)->status());
    }

    public function testPaiementTardifAvecCreneauEncoreLibre(): void
    {
        $id = $this->reserver();
        ($this->session)($id);
        $this->clock->modify('+20 minutes');
        $r = $this->reservations->get($id);
        $r->expire();
        $this->reservations->save($r);

        $this->payer('cs_test_1');

        self::assertSame(ReservationStatus::Confirmed, $this->reservations->get($id)->status());
        self::assertSame([], $this->gateway->refunds);
    }

    public function testPaiementTardifCreneauReprisRembourse(): void
    {
        $id = $this->reserver();
        ($this->session)($id);
        $this->clock->modify('+20 minutes'); // blocage terminé : un autre client prend le créneau
        $autre = $this->reserver('autre@example.test');
        ($this->session)($autre);
        $this->payer('cs_test_2', 'evt_autre');

        $this->payer('cs_test_1');

        self::assertNotSame(ReservationStatus::Confirmed, $this->reservations->get($id)->status());
        self::assertSame([['sessionId' => 'cs_test_1', 'amount' => 3000]], $this->gateway->refunds);
        self::assertSame(PaymentStatus::Refunded, $this->payments->bySessionId('cs_test_1')?->status());
        self::assertSame('creneau_indisponible', $this->notifier->of('payment_refunded')[0]['context']['reason']);
    }

    public function testSessionImpossibleApresLaFinDuBlocage(): void
    {
        $id = $this->reserver();
        $this->clock->modify('+10 minutes');

        $this->expectException(DomainError::class);
        ($this->session)($id);
    }

    public function testAnnulationGratuiteRembourseLAcompte(): void
    {
        $id = $this->reserver();
        ($this->session)($id);
        $this->payer('cs_test_1');

        self::assertTrue(($this->annuler)($id, 'u-1'));

        self::assertSame([['sessionId' => 'cs_test_1', 'amount' => 3000]], $this->gateway->refunds);
        self::assertSame(PaymentStatus::Refunded, $this->payments->bySessionId('cs_test_1')?->status());
    }

    public function testAnnulationTardiveSansRemboursement(): void
    {
        $id = $this->reserver();
        ($this->session)($id);
        $this->payer('cs_test_1');
        $this->clock->set('2026-11-09 10:00');

        self::assertFalse(($this->annuler)($id, 'u-1'));
        self::assertSame([], $this->gateway->refunds);
    }

    public function testRemboursementPartielPuisSolde(): void
    {
        $id = $this->reserver();
        ($this->session)($id);
        $this->payer('cs_test_1');

        self::assertSame(1000, ($this->rembourser)($id, 1000)->cents);
        self::assertSame(2000, ($this->rembourser)($id)->cents, 'le reste');
        self::assertSame(0, ($this->rembourser)($id)->cents, 'plus rien');
        self::assertSame(PaymentStatus::Refunded, $this->payments->bySessionId('cs_test_1')?->status());
    }

    public function testRienARembourserSansPaiement(): void
    {
        self::assertSame(0, ($this->rembourser)($this->reserver())->cents);
        self::assertSame([], $this->gateway->refunds);
    }

    public function testProduitsPayesAvecLAcompteEtRembourserALAnnulationGratuite(): void
    {
        $id = $this->reserver(produits: ['micro' => 2]);
        ($this->session)($id);

        self::assertSame(4200, $this->gateway->checkouts[0]['amount'], 'acompte 30 € + 2 microfibres 12 €');
        self::assertSame('Acompte : Nettoyage + 2 × Microfibre', $this->gateway->checkouts[0]['description']);
        self::assertSame(3, $this->produits->get('micro')->stock());

        $this->payer('cs_test_1');
        ($this->annuler)($id, 'u-1');

        self::assertSame(4200, $this->gateway->refunds[0]['amount'] ?? null, 'acompte et produits remboursés');
        self::assertSame(5, $this->produits->get('micro')->stock(), 'produits remis en stock');
    }

    public function testPayerPlusTardDepuisLEspaceClient(): void
    {
        $id = $this->reserver(produits: ['micro' => 1]);
        $this->clock->modify('+20 minutes'); // client parti sans payer
        $r = $this->reservations->get($id);
        $r->expire();
        $this->reservations->save($r);
        $this->produits->get('micro')->remettreEnStock(1); // comme à l'expiration

        $url = ($this->reprendre)($id, 'u-1');

        self::assertSame('https://paiement.test/cs_test_1', $url);
        self::assertSame(ReservationStatus::PendingPayment, $this->reservations->get($id)->status());
        self::assertSame('2026-11-01T10:30:00+00:00', $this->reservations->get($id)->holdExpiresAt()?->format(DATE_ATOM), 'de nouveau bloqué 10 min');
        self::assertSame(3600, $this->gateway->checkouts[0]['amount'], 'acompte + produit');
        self::assertSame(4, $this->produits->get('micro')->stock(), 'produit repris');

        $this->payer('cs_test_1');
        self::assertSame(ReservationStatus::Confirmed, $this->reservations->get($id)->status());
    }

    public function testCreneauReprisIlFautEnChoisirUnAutrePuisPayer(): void
    {
        $id = $this->reserver();
        $this->clock->modify('+20 minutes');
        $autre = $this->reserver('autre@example.test');
        ($this->session)($autre);
        $this->payer('cs_test_1', 'evt_autre');

        try {
            ($this->reprendre)($id, 'u-1');
            self::fail('créneau repris attendu');
        } catch (\Bsandoz\Core\Shared\Domain\Conflit $e) {
            self::assertStringContainsString('plus disponible', $e->getMessage());
        }

        ($this->deplacer)($id, new \DateTimeImmutable('2026-11-10 10:00', new \DateTimeZone('Europe/Paris')), 'u-1');
        ($this->reprendre)($id, 'u-1');
        self::assertSame(ReservationStatus::PendingPayment, $this->reservations->get($id)->status());
        self::assertSame('2026-11-10T09:00:00+00:00', $this->reservations->get($id)->period()->start->format(DATE_ATOM));
    }

    public function testUneReservationNonPayeePeutEtreAnnulee(): void
    {
        $id = $this->reserver();
        $this->clock->modify('+20 minutes');
        $r = $this->reservations->get($id);
        $r->expire();
        $this->reservations->save($r);

        self::assertFalse(($this->annuler)($id, 'u-1'), 'rien à rembourser');
        self::assertSame(ReservationStatus::Cancelled, $this->reservations->get($id)->status());
        $this->expectException(\Bsandoz\Core\Shared\Domain\DomainError::class);
        ($this->reprendre)($id, 'u-1');
    }
}
