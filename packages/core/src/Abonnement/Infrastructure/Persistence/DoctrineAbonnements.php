<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Infrastructure\Persistence;

use Bsandoz\Core\Abonnement\Domain\Model\Abonnement;
use Bsandoz\Core\Abonnement\Domain\Port\Abonnements;
use Bsandoz\Core\Shared\Domain\NotFound;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineAbonnements implements Abonnements
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $id): Abonnement
    {
        return $this->em->find(Abonnement::class, $id) ?? throw new NotFound('Abonnement introuvable.');
    }

    public function duClient(string $userId): array
    {
        /** @var list<Abonnement> */
        return $this->em->getRepository(Abonnement::class)->findBy(['userId' => $userId], ['creeLe' => 'DESC']);
    }

    public function parSession(string $sessionId): ?Abonnement
    {
        return $this->em->getRepository(Abonnement::class)->findOneBy(['sessionId' => $sessionId]);
    }

    public function parFournisseur(string $fournisseurId): ?Abonnement
    {
        return $this->em->getRepository(Abonnement::class)->findOneBy(['fournisseurId' => $fournisseurId]);
    }

    public function tous(): array
    {
        /** @var list<Abonnement> */
        return $this->em->getRepository(Abonnement::class)->findBy([], ['creeLe' => 'DESC']);
    }

    public function save(Abonnement $abonnement): void
    {
        $this->em->persist($abonnement);
        $this->em->flush();
    }
}
