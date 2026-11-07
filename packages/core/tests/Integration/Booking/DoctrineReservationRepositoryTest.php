<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration\Booking;

use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Infrastructure\Persistence\DoctrineReservationRepository;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Tests\Integration\DoctrineTestCase;

final class DoctrineReservationRepositoryTest extends DoctrineTestCase
{
    private DoctrineReservationRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = new DoctrineReservationRepository($this->em);
    }

    private static function utc(string $datetime): \DateTimeImmutable
    {
        return new \DateTimeImmutable($datetime, new \DateTimeZone('UTC'));
    }

    private static function reservation(string $id, string $start, string $end, string $userId = 'u-1'): Reservation
    {
        return new Reservation(
            $id, $userId, 'p-1', 'v-1', ['o-1'],
            new TimeRange(self::utc($start), self::utc($end)),
            '1 rue de l\'Exemple', 49.89, 2.29,
            Money::cents(15900), Money::cents(4770), Money::cents(700),
            ['cle' => 'valeur'], 'Portail bleu',
        );
    }

    public function testEnregistreEtRelitToutesLesDonnees(): void
    {
        $now = self::utc('2026-11-07 10:00');
        $this->repository->save(Reservation::hold(self::reservation('r-1', '2026-11-10 08:00', '2026-11-10 10:00'), $now, 10));
        $this->reload();

        $r = $this->repository->get('r-1');
        self::assertSame('u-1', $r->userId());
        self::assertSame('p-1', $r->prestationId());
        self::assertSame('v-1', $r->variante());
        self::assertSame(['o-1'], $r->optionIds());
        self::assertSame('2026-11-10T08:00:00+00:00', $r->period()->start->format(DATE_ATOM));
        self::assertSame('2026-11-10T10:00:00+00:00', $r->period()->end->format(DATE_ATOM));
        self::assertSame('1 rue de l\'Exemple', $r->address());
        self::assertSame(49.89, $r->lat());
        self::assertSame(2.29, $r->lng());
        self::assertSame(15900, $r->total()->cents);
        self::assertSame(4770, $r->deposit()->cents);
        self::assertSame(700, $r->travelFee()->cents);
        self::assertSame(['cle' => 'valeur'], $r->metierData());
        self::assertSame('Portail bleu', $r->notes());
        self::assertSame(ReservationStatus::PendingPayment, $r->status());
        self::assertTrue($r->blocks($now->modify('+9 minutes')), 'le blocage de 10 min est conservé');
        self::assertFalse($r->blocks($now->modify('+10 minutes')));
    }

    public function testLesDatesSontStockeesEnUtcQuelQueSoitLeFuseau(): void
    {
        $paris = new \DateTimeZone('Europe/Paris');
        $r = new Reservation(
            'r-1', 'u-1', 'p-1', null, [],
            new TimeRange(new \DateTimeImmutable('2026-11-10 09:00', $paris), new \DateTimeImmutable('2026-11-10 10:00', $paris)),
            'adresse', 49.0, 2.0, Money::cents(100), Money::zero(), Money::zero(),
        );
        $this->repository->save($r);
        $this->reload();

        self::assertSame('2026-11-10T08:00:00+00:00', $this->repository->get('r-1')->period()->start->format(DATE_ATOM));
    }

    public function testStatutConserve(): void
    {
        $r = self::reservation('r-1', '2026-11-10 08:00', '2026-11-10 10:00');
        $r->confirm();
        $this->repository->save($r);
        $this->reload();

        self::assertSame(ReservationStatus::Confirmed, $this->repository->get('r-1')->status());
    }

    public function testReservationsQuiChevauchentUnePeriode(): void
    {
        $this->repository->save(self::reservation('avant', '2026-11-10 06:00', '2026-11-10 08:00'));
        $this->repository->save(self::reservation('debut', '2026-11-10 07:00', '2026-11-10 09:00'));
        $this->repository->save(self::reservation('dedans', '2026-11-10 10:00', '2026-11-10 11:00'));
        $this->repository->save(self::reservation('fin', '2026-11-10 11:30', '2026-11-10 13:00'));
        $this->repository->save(self::reservation('apres', '2026-11-10 12:00', '2026-11-10 14:00'));
        $this->reload();

        $ids = array_map(static fn (Reservation $r): string => $r->id(), $this->repository->between(self::utc('2026-11-10 08:00'), self::utc('2026-11-10 12:00')));

        self::assertSame(['debut', 'dedans', 'fin'], $ids, 'bornes exclues : « avant » finit à 08:00, « apres » commence à 12:00');
    }

    public function testReservationsDUnClientDeLaPlusRecenteALaPlusAncienne(): void
    {
        $this->repository->save(self::reservation('r-1', '2026-11-10 08:00', '2026-11-10 09:00'));
        $this->repository->save(self::reservation('r-2', '2026-12-01 08:00', '2026-12-01 09:00'));
        $this->repository->save(self::reservation('autre', '2026-11-20 08:00', '2026-11-20 09:00', 'u-2'));
        $this->reload();

        self::assertSame(['r-2', 'r-1'], array_map(static fn (Reservation $r): string => $r->id(), $this->repository->forUser('u-1')));
    }

    public function testReservationIntrouvable(): void
    {
        $this->expectException(NotFound::class);
        $this->repository->get('inconnue');
    }
}
