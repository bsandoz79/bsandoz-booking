<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Infrastructure\Persistence;

use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Shared\Domain\NotFound;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrinePrestationRepository implements PrestationRepository
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $id): Prestation
    {
        return $this->em->find(Prestation::class, $id) ?? throw new NotFound('Prestation introuvable.');
    }

    public function all(): array
    {
        /** @var list<Prestation> */
        return $this->em->getRepository(Prestation::class)->findBy([], ['position' => 'ASC', 'name' => 'ASC']);
    }

    public function allActive(): array
    {
        /** @var list<Prestation> */
        return $this->em->getRepository(Prestation::class)->findBy(['active' => true], ['position' => 'ASC', 'name' => 'ASC']);
    }

    public function save(Prestation $prestation): void
    {
        $this->em->persist($prestation);
        $this->em->flush();
    }

    public function remove(Prestation $prestation): void
    {
        $this->em->remove($prestation);
        $this->em->flush();
    }
}
