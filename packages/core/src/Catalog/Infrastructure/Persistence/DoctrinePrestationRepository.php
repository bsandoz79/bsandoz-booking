<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Infrastructure\Persistence;

use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrinePrestationRepository implements PrestationRepository
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    /** @todo find() ou DomainError « Prestation introuvable ». */
    public function get(string $id): Prestation { throw new \LogicException('À implémenter'); }

    /** @todo active = true, ORDER BY position. */
    public function allActive(): array { throw new \LogicException('À implémenter'); }

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
