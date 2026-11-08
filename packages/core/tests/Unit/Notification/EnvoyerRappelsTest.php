<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Notification;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Booking\Application\NotificationsReservation;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Infrastructure\Settings\ConfiguredSettingsProvider;
use Bsandoz\Core\Notification\Application\EnvoyerRappels;
use Bsandoz\Core\Notification\Domain\Service\IcsGenerator;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryJournalNotifications;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use Bsandoz\Core\Tests\Double\InMemoryReservationRepository;
use Bsandoz\Core\Tests\Double\InMemoryTokenService;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use Bsandoz\Core\Tests\Double\RecordingNotifier;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

/** Rappels de la veille. Horloge : lundi 09/11/2026 18:00 à Paris (17:00 UTC) ; « demain » = mardi 10/11 en heure de Paris. */
final class EnvoyerRappelsTest extends TestCase
{
    private InMemoryReservationRepository $reservations;
    private InMemoryJournalNotifications $journal;
    private InMemoryTokenService $tokens;
    private RecordingNotifier $notifier;
    private FrozenClock $clock;
    private EnvoyerRappels $rappels;

    protected function setUp(): void
    {
        $this->clock = new FrozenClock('2026-11-09 17:00');
        $this->reservations = new InMemoryReservationRepository();
        $this->journal = new InMemoryJournalNotifications();
        $this->tokens = new InMemoryTokenService($this->clock);
        $this->notifier = new RecordingNotifier();
        $users = new InMemoryUserRepository();
        $users->save(new User('u-1', 'camille@example.test', 'Camille', 'Martin', '0600000000'));
        $settings = new ConfiguredSettingsProvider(
            ['min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 0, 'slot_step_min' => 30, 'free_cancel_hours' => 48, 'deposit_percent' => 30, 'deposit_fixed_cents' => null, 'hold_minutes' => 10],
            null,
            'Europe/Paris',
        );
        $notifications = new NotificationsReservation($this->notifier, $users, new InMemoryPrestationRepository(), new IcsGenerator(), 'Marque');
        $this->rappels = new EnvoyerRappels($this->reservations, $this->journal, $notifications, $this->tokens, $settings, new SequenceIdGenerator('n'), $this->clock);
    }

    private function reservation(string $id, string $debutParis, bool $confirmee = true): void
    {
        $paris = new \DateTimeZone('Europe/Paris');
        $debut = new \DateTimeImmutable($debutParis, $paris);
        $r = new Reservation($id, 'u-1', 'p-1', null, [], new TimeRange($debut, $debut->modify('+1 hour')), 'adresse', 0.0, 0.0, Money::cents(100), Money::zero(), Money::zero());
        if ($confirmee) {
            $r->confirm();
        }
        $this->reservations->save($r);
    }

    public function testRappelDesRendezVousConfirmesDuLendemain(): void
    {
        $this->reservation('demain-tot', '2026-11-10 00:30');
        $this->reservation('demain-soir', '2026-11-10 23:30');
        $this->reservation('aujourd-hui', '2026-11-09 20:00');
        $this->reservation('apres-demain', '2026-11-11 08:00');
        $this->reservation('non-confirmee', '2026-11-10 10:00', false);

        self::assertSame(2, ($this->rappels)());

        $ids = array_map(static fn (array $mail): mixed => $mail['context']['reservationId'], $this->notifier->of('reminder'));
        sort($ids);
        self::assertSame(['demain-soir', 'demain-tot'], $ids, 'journée du lendemain en heure de Paris, de 00:00 à 23:59');
    }

    public function testLienDeGestionDansLeRappel(): void
    {
        $this->reservation('r-1', '2026-11-10 09:00');
        ($this->rappels)();

        $lien = $this->notifier->of('reminder')[0]['context']['manageToken'];
        self::assertIsString($lien);
        self::assertSame('r-1', $this->tokens->verify($lien, TokenType::ManageReservation));
    }

    public function testUnSeulRappelMemeSiLeCronPasseSouvent(): void
    {
        $this->reservation('r-1', '2026-11-10 09:00');

        self::assertSame(1, ($this->rappels)());
        $this->clock->modify('+15 minutes');
        self::assertSame(0, ($this->rappels)());
        self::assertCount(1, $this->notifier->of('reminder'));
        self::assertCount(1, $this->journal->items);
    }
}
