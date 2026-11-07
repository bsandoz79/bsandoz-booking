<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Persistence;

use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Shared\Domain\NotFound;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineReservationRepository implements ReservationRepository
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $id): Reservation
    {
        return $this->em->find(Reservation::class, $id) ?? throw new NotFound('Réservation introuvable.');
    }

    public function between(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        /** @var list<Reservation> */
        return $this->em->createQueryBuilder()
            ->select('r')
            ->from(Reservation::class, 'r')
            ->where('r.period.start < :to')
            ->andWhere('r.period.end > :from')
            ->setParameter('from', $from, 'datetime_utc_immutable')
            ->setParameter('to', $to, 'datetime_utc_immutable')
            ->orderBy('r.period.start', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function forUser(string $userId): array
    {
        /** @var list<Reservation> */
        return $this->em->getRepository(Reservation::class)->findBy(['userId' => $userId], ['period.start' => 'DESC']);
    }

    public function save(Reservation $reservation): void
    {
        $this->em->persist($reservation);
        $this->em->flush();
    }

    /** @todo feature/core-booking-reservation : verrou (transaction + SELECT … FOR UPDATE) autour de ReserverCreneau. */
    public function lockAgenda(): void
    {
        throw new \LogicException('À implémenter');
    }
}
