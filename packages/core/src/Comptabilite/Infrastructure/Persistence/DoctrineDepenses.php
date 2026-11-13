<?php

declare(strict_types=1);

namespace Bsandoz\Core\Comptabilite\Infrastructure\Persistence;

use Bsandoz\Core\Comptabilite\Domain\Model\Depense;
use Bsandoz\Core\Comptabilite\Domain\Port\Depenses;
use Bsandoz\Core\Shared\Domain\NotFound;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineDepenses implements Depenses
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $id): Depense
    {
        return $this->em->find(Depense::class, $id) ?? throw new NotFound('Dépense introuvable.');
    }

    public function toutes(): array
    {
        /** @var list<Depense> */
        return $this->em->getRepository(Depense::class)->findBy([], ['le' => 'DESC']);
    }

    public function save(Depense $depense): void
    {
        $this->em->persist($depense);
        $this->em->flush();
    }

    public function supprimer(Depense $depense): void
    {
        $this->em->remove($depense);
        $this->em->flush();
    }
}
