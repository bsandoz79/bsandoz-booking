<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Persistence;

use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\Unavailability;
use Bsandoz\Core\Booking\Domain\Port\AvailabilityRepository;
use Bsandoz\Core\Shared\Domain\NotFound;
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
        return array_map(static fn (Unavailability $u) => $u->period, $this->unavailabilityList($from, $to));
    }

    public function unavailabilityList(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        /** @var list<Unavailability> */
        return $this->em->createQueryBuilder()
            ->select('u')
            ->from(Unavailability::class, 'u')
            ->where('u.period.start < :to')
            ->andWhere('u.period.end > :from')
            ->setParameter('from', $from, 'datetime_utc_immutable')
            ->setParameter('to', $to, 'datetime_utc_immutable')
            ->orderBy('u.period.start', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function saveOpeningHour(OpeningHour $openingHour): void
    {
        $this->em->persist($openingHour);
        $this->em->flush();
    }

    public function replaceOpeningHours(array $openingHours): void
    {
        $this->em->wrapInTransaction(function () use ($openingHours): void {
            foreach ($this->em->getRepository(OpeningHour::class)->findAll() as $existant) {
                $this->em->remove($existant);
            }
            $this->em->flush();
            foreach ($openingHours as $openingHour) {
                $this->em->persist($openingHour);
            }
        });
    }

    public function saveUnavailability(Unavailability $unavailability): void
    {
        $this->em->persist($unavailability);
        $this->em->flush();
    }

    public function removeUnavailability(string $id): void
    {
        $unavailability = $this->em->find(Unavailability::class, $id) ?? throw new NotFound('Indisponibilité introuvable.');
        $this->em->remove($unavailability);
        $this->em->flush();
    }
}
