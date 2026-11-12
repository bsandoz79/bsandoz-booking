<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Infrastructure\Persistence;

use Bsandoz\Core\Catalog\Domain\Model\Produit;
use Bsandoz\Core\Catalog\Domain\Port\ProduitRepository;
use Bsandoz\Core\Shared\Domain\NotFound;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineProduitRepository implements ProduitRepository
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $id): Produit
    {
        return $this->em->find(Produit::class, $id) ?? throw new NotFound('Produit introuvable.');
    }

    public function all(): array
    {
        /** @var list<Produit> */
        return $this->em->getRepository(Produit::class)->findBy([], ['position' => 'ASC', 'nom' => 'ASC']);
    }

    public function enVente(): array
    {
        /** @var list<Produit> */
        return $this->em->createQueryBuilder()
            ->select('p')->from(Produit::class, 'p')
            ->where('p.actif = true')->andWhere('p.stock > 0')
            ->orderBy('p.position', 'ASC')->addOrderBy('p.nom', 'ASC')
            ->getQuery()->getResult();
    }

    public function save(Produit $produit): void
    {
        $this->em->persist($produit);
        $this->em->flush();
    }
}
