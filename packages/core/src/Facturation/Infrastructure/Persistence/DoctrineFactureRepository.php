<?php

declare(strict_types=1);

namespace Bsandoz\Core\Facturation\Infrastructure\Persistence;

use Bsandoz\Core\Facturation\Domain\Model\Facture;
use Bsandoz\Core\Facturation\Domain\Port\FactureRepository;
use Bsandoz\Core\Shared\Domain\NotFound;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineFactureRepository implements FactureRepository
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $id): Facture
    {
        return $this->em->find(Facture::class, $id) ?? throw new NotFound('Facture introuvable.');
    }

    public function pourReservation(string $reservationId): ?Facture
    {
        return $this->em->getRepository(Facture::class)->findOneBy(['reservationId' => $reservationId]);
    }

    public function pourClient(string $userId): array
    {
        /** @var list<Facture> */
        return $this->em->getRepository(Facture::class)->findBy(['userId' => $userId], ['numero' => 'DESC']);
    }

    public function toutes(): array
    {
        /** @var list<Facture> */
        return $this->em->getRepository(Facture::class)->findBy([], ['numero' => 'DESC']);
    }

    public function dernierNumero(int $annee): ?string
    {
        $numero = $this->em->createQueryBuilder()
            ->select('MAX(f.numero)')->from(Facture::class, 'f')
            ->where('f.numero LIKE :prefixe')->setParameter('prefixe', sprintf('F-%d-%%', $annee))
            ->getQuery()->getSingleScalarResult();

        return is_string($numero) ? $numero : null;
    }

    public function save(Facture $facture): void
    {
        $this->em->persist($facture);
        $this->em->flush();
    }
}
