<?php

declare(strict_types=1);

namespace Bsandoz\Core\Fidelite\Infrastructure\Persistence;

use Bsandoz\Core\Fidelite\Domain\Model\CarteFidelite;
use Bsandoz\Core\Fidelite\Domain\Port\CartesFidelite;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineCartesFidelite implements CartesFidelite
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $userId): ?CarteFidelite
    {
        return $this->em->find(CarteFidelite::class, $userId);
    }

    public function save(CarteFidelite $carte): void
    {
        $this->em->persist($carte);
        $this->em->flush();
    }
}
