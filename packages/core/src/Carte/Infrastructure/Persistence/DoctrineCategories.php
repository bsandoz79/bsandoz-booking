<?php

declare(strict_types=1);

namespace Bsandoz\Core\Carte\Infrastructure\Persistence;

use Bsandoz\Core\Carte\Domain\Model\Categorie;
use Bsandoz\Core\Carte\Domain\Port\Categories;
use Bsandoz\Core\Shared\Domain\NotFound;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineCategories implements Categories
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $id): Categorie
    {
        return $this->em->find(Categorie::class, $id) ?? throw new NotFound('Rubrique introuvable.');
    }

    public function all(): array
    {
        /** @var list<Categorie> */
        return $this->em->getRepository(Categorie::class)->findBy([], ['position' => 'ASC', 'nom' => 'ASC']);
    }

    public function save(Categorie $categorie): void
    {
        $this->em->persist($categorie);
        $this->em->flush();
    }

    public function remove(Categorie $categorie): void
    {
        $this->em->remove($categorie);
        $this->em->flush();
    }
}
