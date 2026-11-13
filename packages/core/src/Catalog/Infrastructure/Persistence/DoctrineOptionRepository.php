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

    public function all(): array
    {
        /** @var list<Option> */
        return $this->em->getRepository(Option::class)->findBy([], ['position' => 'ASC', 'name' => 'ASC']);
    }

    public function allActive(): array
    {
        /** @var list<Option> */
        return $this->em->getRepository(Option::class)->findBy(['active' => true], ['position' => 'ASC', 'name' => 'ASC']);
    }

    /** Les propriétés d'une option sont en lecture seule : une option existante est remplacée par une mise à jour en base. */
    public function save(Option $option): void
    {
        $existante = $this->em->find(Option::class, $option->id);
        if ($existante === null || $existante === $option) {
            $this->em->persist($option);
            $this->em->flush();

            return;
        }

        $this->em->createQueryBuilder()
            ->update(Option::class, 'o')
            ->set('o.name', ':name')
            ->set('o.description', ':description')
            ->set('o.price', ':price')
            ->set('o.durationMin', ':duration')
            ->set('o.active', ':active')
            ->set('o.position', ':position')
            ->where('o.id = :id')
            ->setParameter('name', $option->name)
            ->setParameter('description', $option->description)
            ->setParameter('price', $option->price, 'bsandoz_money')
            ->setParameter('duration', $option->durationMin)
            ->setParameter('active', $option->active, 'boolean')
            ->setParameter('position', $option->position)
            ->setParameter('id', $option->id)
            ->getQuery()
            ->execute();
        $this->em->detach($existante);
    }
}
