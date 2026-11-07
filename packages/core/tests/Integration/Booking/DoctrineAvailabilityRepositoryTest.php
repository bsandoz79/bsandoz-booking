<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration\Booking;

use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\Unavailability;
use Bsandoz\Core\Booking\Infrastructure\Persistence\DoctrineAvailabilityRepository;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Tests\Integration\DoctrineTestCase;

final class DoctrineAvailabilityRepositoryTest extends DoctrineTestCase
{
    private DoctrineAvailabilityRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = new DoctrineAvailabilityRepository($this->em);
    }

    private static function utc(string $datetime): \DateTimeImmutable
    {
        return new \DateTimeImmutable($datetime, new \DateTimeZone('UTC'));
    }

    public function testHorairesTriesParJourPuisHeure(): void
    {
        $this->repository->saveOpeningHour(new OpeningHour(4, '08:00', '12:00'));
        $this->repository->saveOpeningHour(new OpeningHour(2, '14:00', '18:00'));
        $this->repository->saveOpeningHour(new OpeningHour(2, '08:00', '12:00', 'mardi-matin'));
        $this->reload();

        $hours = $this->repository->openingHours();
        self::assertSame(
            ['2 08:00-12:00', '2 14:00-18:00', '4 08:00-12:00'],
            array_map(static fn (OpeningHour $h): string => "{$h->weekday} {$h->startsAt}-{$h->endsAt}", $hours),
        );
        self::assertSame('mardi-matin', $hours[0]->id);
    }

    public function testIndisponibilitesQuiChevauchentUnePeriode(): void
    {
        $this->repository->saveUnavailability(new Unavailability(new TimeRange(self::utc('2026-11-01 00:00'), self::utc('2026-11-09 00:00')), 'Congés'));
        $this->repository->saveUnavailability(new Unavailability(new TimeRange(self::utc('2026-11-10 09:00'), self::utc('2026-11-10 11:00')), 'Garage'));
        $this->repository->saveUnavailability(new Unavailability(new TimeRange(self::utc('2026-11-20 00:00'), self::utc('2026-11-21 00:00'))));
        $this->reload();

        $periods = $this->repository->unavailabilities(self::utc('2026-11-09 00:00'), self::utc('2026-11-11 00:00'));

        self::assertCount(1, $periods, 'les congés finissent pile au début de la période : exclus');
        self::assertSame('2026-11-10T09:00:00+00:00', $periods[0]->start->format(DATE_ATOM));
        self::assertSame('2026-11-10T11:00:00+00:00', $periods[0]->end->format(DATE_ATOM));
    }

    public function testIdentifiantGenereSiAbsent(): void
    {
        $a = new OpeningHour(1, '08:00', '12:00');
        $b = new OpeningHour(1, '08:00', '12:00');

        self::assertSame(32, strlen($a->id));
        self::assertNotSame($a->id, $b->id);
    }
}
