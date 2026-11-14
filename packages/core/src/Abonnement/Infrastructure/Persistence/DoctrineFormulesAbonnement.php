<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Infrastructure\Persistence;

use Bsandoz\Core\Abonnement\Domain\Model\FormuleAbonnement;
use Bsandoz\Core\Abonnement\Domain\Port\FormulesAbonnement;
use Bsandoz\Core\Shared\Domain\NotFound;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineFormulesAbonnement implements FormulesAbonnement
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $id): FormuleAbonnement
    {
        return $this->em->find(FormuleAbonnement::class, $id) ?? throw new NotFound('Abonnement introuvable.');
    }

    public function toutes(): array
    {
        /** @var list<FormuleAbonnement> */
        return $this->em->getRepository(FormuleAbonnement::class)->findBy([], ['position' => 'ASC', 'nom' => 'ASC']);
    }

    public function save(FormuleAbonnement $formule): void
    {
        $this->em->persist($formule);
        $this->em->flush();
    }
}
