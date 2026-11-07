<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Infrastructure\Persistence;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Port\OptionRepository;
use Bsandoz\Core\Shared\Domain\NotFound;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineOptionRepository implements OptionRepository
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $id): Option
    {
        return $this->em->find(Option::class, $id) ?? throw new NotFound('Option introuvable.');
    }

    public function getMany(array $ids): array
    {
        $ids = array_values(array_unique($ids));
        if ($ids === []) {
            return [];
        }

        $byId = [];
        foreach ($this->em->getRepository(Option::class)->findBy(['id' => $ids]) as $option) {
            $byId[$option->id] = $option;
        }

        $options = [];
        foreach ($ids as $id) {
            $options[] = $byId[$id] ?? throw new NotFound('Option introuvable.');
        }

        return $options;
    }

    public function allActive(): array
    {
        /** @var list<Option> */
        return $this->em->getRepository(Option::class)->findBy(['active' => true], ['name' => 'ASC']);
    }

    public function save(Option $option): void
    {
        $this->em->persist($option);
        $this->em->flush();
    }
}
