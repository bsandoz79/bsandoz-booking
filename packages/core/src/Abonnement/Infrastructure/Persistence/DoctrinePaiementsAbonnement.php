<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Infrastructure\Persistence;

use Bsandoz\Core\Abonnement\Domain\Model\PaiementAbonnement;
use Bsandoz\Core\Abonnement\Domain\Port\PaiementsAbonnement;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrinePaiementsAbonnement implements PaiementsAbonnement
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function existe(string $factureFournisseurId): bool
    {
        return $this->em->getRepository(PaiementAbonnement::class)->findOneBy(['factureFournisseurId' => $factureFournisseurId]) !== null;
    }

    public function entre(\DateTimeImmutable $debut, \DateTimeImmutable $fin): array
    {
        /** @var list<PaiementAbonnement> */
        return $this->em->createQueryBuilder()
            ->select('p')->from(PaiementAbonnement::class, 'p')
            ->where('p.payeLe >= :debut')->andWhere('p.payeLe < :fin')
            ->setParameter('debut', $debut, 'datetime_utc_immutable')->setParameter('fin', $fin, 'datetime_utc_immutable')
            ->orderBy('p.payeLe', 'ASC')
            ->getQuery()->getResult();
    }

    public function save(PaiementAbonnement $paiement): void
    {
        $this->em->persist($paiement);
        $this->em->flush();
    }
}
