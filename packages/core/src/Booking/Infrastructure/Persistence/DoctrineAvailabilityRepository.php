<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Persistence;

use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\Unavailability;
use Bsandoz\Core\Booking\Domain\Port\AvailabilityRepository;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineAvailabilityRepository implements AvailabilityRepository
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function openingHours(): array
    {
        /** @var list<OpeningHour> */
        return $this->em->getRepository(OpeningHour::class)->findBy([], ['weekday' => 'ASC', 'startsAt' => 'ASC']);
    }

    public function unavailabilities(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        /** @var list<Unavailability> $rows */
        $rows = $this->em->createQueryBuilder()
            ->select('u')
            ->from(Unavailability::class, 'u')
            ->where('u.period.start < :to')
            ->andWhere('u.period.end > :from')
            ->setParameter('from', $from, 'datetime_utc_immutable')
            ->setParameter('to', $to, 'datetime_utc_immutable')
            ->orderBy('u.period.start', 'ASC')
            ->getQuery()
            ->getResult();

        return array_map(static fn (Unavailability $u) => $u->period, $rows);
    }

    public function saveOpeningHour(OpeningHour $openingHour): void
    {
        $this->em->persist($openingHour);
        $this->em->flush();
    }

    public function saveUnavailability(Unavailability $unavailability): void
    {
        $this->em->persist($unavailability);
        $this->em->flush();
    }
}
