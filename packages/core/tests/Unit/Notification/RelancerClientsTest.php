<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Notification;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Infrastructure\Settings\ConfiguredSettingsProvider;
use Bsandoz\Core\Notification\Application\RelancerClients;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryJournalNotifications;
use Bsandoz\Core\Tests\Double\InMemoryReservationRepository;
use Bsandoz\Core\Tests\Double\InMemorySettingRepository;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use Bsandoz\Core\Tests\Double\RecordingNotifier;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

/** Relance des clients absents. Aujourd'hui : mardi 10/11/2026, 11 h à Paris (en journée). */
final class RelancerClientsTest extends TestCase
{
    private FrozenClock $clock;
    private InMemoryReservationRepository $reservations;
    private RecordingNotifier $notifier;
    private RelancerClients $relance;
    private int $n = 0;

    protected function setUp(): void
    {
        $this->clock = new FrozenClock('2026-11-10 10:00');
        $this->reservations = new InMemoryReservationRepository();
        $this->notifier = new RecordingNotifier();
        $users = new InMemoryUserRepository();
        foreach (['u-a' => 'Alice', 'u-b' => 'Bruno', 'u-c' => 'Chloé'] as $id => $prenom) {
            $users->save(new User($id, strtolower($prenom) . '@example.test', $prenom, 'Test', '0600000000'));
        }
        $settings = new ConfiguredSettingsProvider(
            ['min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 0, 'slot_step_min' => 60, 'free_cancel_hours' => 48, 'deposit_percent' => null, 'deposit_fixed_cents' => null, 'hold_minutes' => 10],
            null,
            'Europe/Paris',
        );
        $this->relance = new RelancerClients($this->reservations, $users, new InMemoryJournalNotifications(), $this->notifier, new InMemorySettingRepository(),
            $settings, new SequenceIdGenerator('n'), $this->clock, 'secret-de-test');

        $this->rdv('u-a', '2026-06-01 09:00', 'done');   // absente depuis plus de 90 jours : relancée
        $this->rdv('u-b', '2026-05-01 09:00', 'done');   // absent, mais revient bientôt : pas de relance
        $this->rdv('u-b', '2026-11-20 09:00', 'confirmed');
        $this->rdv('u-c', '2026-10-15 09:00', 'done');   // venue récemment : pas de relance
    }

    private function rdv(string $user, string $debutUtc, string $statut): void
    {
        $d = new \DateTimeImmutable($debutUtc, new \DateTimeZone('UTC'));
        $r = new Reservation('r-' . ++$this->n, $user, 'p', null, [], new TimeRange($d, $d->modify('+1 hour')), 'a', 50.0, 1.8, Money::cents(5000), Money::zero(), Money::zero());
        $r->confirm();
        if ($statut === 'done') {
            $r->markDone($d->modify('+2 hours'));
        }
        $this->reservations->save($r);
    }

    /** @return list<string> */
    private function envoyes(): array
    {
        return array_column(array_filter($this->notifier->sent, static fn (array $m): bool => $m['template'] === 'customer_reminder'), 'to');
    }

    public function testDesactiveeParDefaut(): void
    {
        self::assertSame(['actif' => false, 'jours' => 90, 'desinscrits' => 0], $this->relance->reglage());
        self::assertSame(0, ($this->relance)());
    }

    public function testRelanceUneSeuleFoisLesClientsAbsentsSansRendezVousPrevu(): void
    {
        $this->relance->changer(['actif' => true, 'jours' => 90]);

        self::assertSame(1, ($this->relance)());
        self::assertSame(['alice@example.test'], $this->envoyes());
        $mail = $this->notifier->sent[0];
        self::assertStringStartsWith('u=u-a&s=', $mail['context']['desinscription']);

        // Lancée de nouveau (cron) : pas de second e-mail pour la même absence.
        self::assertSame(0, ($this->relance)());
    }

    public function testPasDEnvoiLaNuit(): void
    {
        $this->relance->changer(['actif' => true, 'jours' => 90]);
        $this->clock->set('2026-11-10 22:00');

        self::assertSame(0, ($this->relance)());
    }

    public function testUnClientDesinscritNEstPlusRelance(): void
    {
        $this->relance->changer(['actif' => true, 'jours' => 90]);
        $this->clock->set('2026-11-10 09:00');
        ($this->relance)();
        $lien = $this->notifier->sent[0]['context']['desinscription'];
        self::assertIsString($lien);
        self::assertSame(1, preg_match('/^u=([^&]+)&s=(.+)$/', $lien, $m));

        $this->relance->desinscrire(rawurldecode($m[1] ?? ''), $m[2] ?? '');
        self::assertSame(1, $this->relance->reglage()['desinscrits']);

        // Nouvelle absence après une nouvelle visite : toujours pas de relance.
        $this->rdv('u-a', '2026-07-01 09:00', 'done');
        self::assertSame(0, ($this->relance)());
    }

    public function testLienDeDesinscriptionFalsifieRefuse(): void
    {
        $this->expectException(NotFound::class);
        $this->relance->desinscrire('u-a', 'faux');
    }

    public function testDelaiHorsLimites(): void
    {
        $this->expectException(DomainError::class);
        $this->relance->changer(['actif' => true, 'jours' => 7]);
    }
}
