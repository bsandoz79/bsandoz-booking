<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Persistence;

use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\NotFound;
use Doctrine\DBAL\Platforms\AbstractMySQLPlatform;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineReservationRepository implements ReservationRepository
{
    private const LOCK = 'bsandoz_agenda';

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

    public function pendingHoldExpired(\DateTimeImmutable $now): array
    {
        /** @var list<Reservation> */
        return $this->em->createQueryBuilder()
            ->select('r')
            ->from(Reservation::class, 'r')
            ->where('r.status = :pending')
            ->andWhere('r.holdExpiresAt IS NOT NULL AND r.holdExpiresAt <= :now')
            ->setParameter('pending', ReservationStatus::PendingPayment)
            ->setParameter('now', $now, 'datetime_utc_immutable')
            ->getQuery()
            ->getResult();
    }

    public function save(Reservation $reservation): void
    {
        $this->em->persist($reservation);
        $this->em->flush();
    }

    /**
     * MySQL / MariaDB : verrou nommé GET_LOCK (attente 10 s max) autour d'une transaction.
     * Autres bases (SQLite des tests) : la transaction seule, les écritures y sont déjà sérialisées.
     */
    public function dansVerrouAgenda(callable $operation): mixed
    {
        $connection = $this->em->getConnection();
        $mysql = $connection->getDatabasePlatform() instanceof AbstractMySQLPlatform;

        if ($mysql && (int) $connection->fetchOne('SELECT GET_LOCK(?, 10)', [self::LOCK]) !== 1) {
            throw new DomainError('L\'agenda est très sollicité, merci de réessayer dans un instant.');
        }

        try {
            return $this->em->wrapInTransaction(static fn () => $operation());
        } finally {
            if ($mysql) {
                $connection->executeQuery('SELECT RELEASE_LOCK(?)', [self::LOCK]);
            }
        }
    }
}
