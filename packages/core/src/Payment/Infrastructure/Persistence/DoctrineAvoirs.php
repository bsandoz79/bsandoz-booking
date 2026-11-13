<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Infrastructure\Persistence;

use Bsandoz\Core\Payment\Domain\Model\Avoir;
use Bsandoz\Core\Payment\Domain\Port\Avoirs;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineAvoirs implements Avoirs
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $userId): ?Avoir
    {
        return $this->em->find(Avoir::class, $userId);
    }

    public function save(Avoir $avoir): void
    {
        $this->em->persist($avoir);
        $this->em->flush();
    }
}
