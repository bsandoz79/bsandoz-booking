<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Persistence;

use Bsandoz\Core\Notification\Domain\Model\AbonnementPush;
use Bsandoz\Core\Notification\Domain\Port\AbonnementsPush;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineAbonnementsPush implements AbonnementsPush
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function parEndpoint(string $endpoint): ?AbonnementPush
    {
        return $this->em->getRepository(AbonnementPush::class)->findOneBy(['endpoint' => $endpoint]);
    }

    public function tous(): array
    {
        return $this->em->getRepository(AbonnementPush::class)->findAll();
    }

    public function enregistrer(AbonnementPush $abonnement): void
    {
        $this->em->persist($abonnement);
        $this->em->flush();
    }

    public function supprimer(AbonnementPush $abonnement): void
    {
        $this->em->remove($abonnement);
        $this->em->flush();
    }
}
