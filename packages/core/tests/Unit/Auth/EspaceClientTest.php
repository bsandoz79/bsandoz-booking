<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Auth;

use Bsandoz\Core\Auth\Application\ExporterDonnees;
use Bsandoz\Core\Auth\Application\SupprimerCompte;
use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Model\UserStatus;
use Bsandoz\Core\Booking\Application\MesReservations;
use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryReservationRepository;
use Bsandoz\Core\Tests\Double\InMemoryTokenService;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use PHPUnit\Framework\TestCase;

/** Mes réservations, export des données et suppression du compte (horloge au 07/11/2026 10:00 UTC). */
final class EspaceClientTest extends TestCase
{
    private InMemoryUserRepository $users;
    private InMemoryReservationRepository $reservations;
    private InMemoryTokenService $tokens;
    private FrozenClock $clock;

    protected function setUp(): void
    {
        $this->clock = new FrozenClock('2026-11-07 10:00');
        $this->users = new InMemoryUserRepository();
        $this->reservations = new InMemoryReservationRepository();
        $this->tokens = new InMemoryTokenService($this->clock);
        $this->users->save(new User('u-1', 'camille@example.test', 'Camille', 'Martin', '0600000000', ['ROLE_CLIENT'], new \DateTimeImmutable('2026-10-01 09:00', new \DateTimeZone('UTC'))));
    }

    private function reservation(string $id, string $start, string $userId = 'u-1'): Reservation
    {
        $utc = new \DateTimeZone('UTC');
        $r = new Reservation(
            $id, $userId, 'p-1', 'v-1', ['o-1'],
            new TimeRange(new \DateTimeImmutable($start, $utc), (new \DateTimeImmutable($start, $utc))->modify('+1 hour')),
            '1 rue de l\'Exemple', 49.89, 2.29, Money::cents(10000), Money::cents(3000), Money::cents(500), ['cle' => 'valeur'], 'Portail bleu',
        );
        $r->confirm();
        $this->reservations->save($r);

        return $r;
    }

    public function testMesReservationsUniquement(): void
    {
        $this->reservation('passee', '2026-10-15 08:00');
        $this->reservation('a-venir', '2026-11-20 08:00');
        $this->reservation('autre-client', '2026-11-21 08:00', 'u-2');

        $ids = array_map(static fn (Reservation $r): string => $r->id(), (new MesReservations($this->reservations))('u-1'));

        self::assertSame(['a-venir', 'passee'], $ids);
    }

    public function testExportDesDonnees(): void
    {
        $this->reservation('r-1', '2026-10-15 08:00');

        $export = (new ExporterDonnees($this->users, $this->reservations))('u-1');

        self::assertSame([
            'id' => 'u-1', 'email' => 'camille@example.test', 'prenom' => 'Camille', 'nom' => 'Martin',
            'telephone' => '0600000000', 'statut' => 'pending', 'creeLe' => '2026-10-01T09:00:00+00:00',
        ], $export['compte']);
        self::assertCount(1, $export['reservations']);
        self::assertSame('r-1', $export['reservations'][0]['id']);
        self::assertSame('2026-10-15T08:00:00+00:00', $export['reservations'][0]['debut']);
        self::assertSame('1 rue de l\'Exemple', $export['reservations'][0]['adresse']);
        self::assertSame(['cle' => 'valeur'], $export['reservations'][0]['donneesMetier']);
    }

    public function testSuppressionDuCompte(): void
    {
        $this->reservation('passee', '2026-10-15 08:00');
        $session = $this->tokens->issue('u-1', TokenType::Refresh, new \DateInterval('P30D'), false);

        (new SupprimerCompte($this->users, $this->reservations, $this->tokens, $this->clock))('u-1');

        $user = $this->users->get('u-1');
        self::assertSame(UserStatus::Deleted, $user->status());
        self::assertSame('', $user->lastname());
        self::assertNull($this->tokens->verify($session, TokenType::Refresh), 'sessions fermées');
        self::assertSame('passee', $this->reservations->get('passee')->id(), 'réservations passées conservées');
    }

    public function testSuppressionRefuseeAvecUnRendezVousAVenir(): void
    {
        $this->reservation('a-venir', '2026-11-20 08:00');

        $this->expectException(DomainError::class);
        (new SupprimerCompte($this->users, $this->reservations, $this->tokens, $this->clock))('u-1');
    }

    public function testSuppressionPossibleApresAnnulation(): void
    {
        $r = $this->reservation('a-venir', '2026-11-20 08:00');
        $r->cancel($this->clock->now(), new BookingRules());
        $this->reservations->save($r);

        (new SupprimerCompte($this->users, $this->reservations, $this->tokens, $this->clock))('u-1');

        self::assertSame(UserStatus::Deleted, $this->users->get('u-1')->status());
    }
}
