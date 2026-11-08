<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Infrastructure\Persistence;

use Bsandoz\Core\Payment\Domain\Model\Payment;
use Bsandoz\Core\Payment\Domain\Model\PaymentStatus;
use Bsandoz\Core\Payment\Domain\Port\PaymentRepository;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrinePaymentRepository implements PaymentRepository
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function save(Payment $payment): void
    {
        $this->em->persist($payment);
        $this->em->flush();
    }

    public function bySessionId(string $sessionId): ?Payment
    {
        return $this->em->getRepository(Payment::class)->findOneBy(['providerSessionId' => $sessionId]);
    }

    public function paidForReservation(string $reservationId): ?Payment
    {
        /** @var Payment|null */
        return $this->em->createQueryBuilder()
            ->select('p')
            ->from(Payment::class, 'p')
            ->where('p.reservationId = :reservation')
            ->andWhere('p.status != :pending')
            ->setParameter('reservation', $reservationId)
            ->setParameter('pending', PaymentStatus::Pending)
            ->orderBy('p.paidAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
