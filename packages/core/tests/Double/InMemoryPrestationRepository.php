<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Shared\Domain\NotFound;

final class InMemoryPrestationRepository implements PrestationRepository
{
    /** @var array<string, Prestation> */
    private array $items = [];

    public function __construct(Prestation ...$prestations)
    {
        foreach ($prestations as $prestation) {
            $this->save($prestation);
        }
    }

    public function get(string $id): Prestation
    {
        return $this->items[$id] ?? throw new NotFound('Prestation introuvable.');
    }

    public function all(): array
    {
        $all = array_values($this->items);
        usort($all, static fn (Prestation $a, Prestation $b): int => [$a->position(), $a->name()] <=> [$b->position(), $b->name()]);

        return $all;
    }

    public function allActive(): array
    {
        $active = array_values(array_filter($this->items, static fn (Prestation $p): bool => $p->isActive()));
        usort($active, static fn (Prestation $a, Prestation $b): int => [$a->position(), $a->name()] <=> [$b->position(), $b->name()]);

        return $active;
    }

    public function save(Prestation $prestation): void
    {
        $this->items[$prestation->id()] = $prestation;
    }

    public function remove(Prestation $prestation): void
    {
        unset($this->items[$prestation->id()]);
    }
}
