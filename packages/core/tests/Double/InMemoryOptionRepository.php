<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Port\OptionRepository;
use Bsandoz\Core\Shared\Domain\NotFound;

final class InMemoryOptionRepository implements OptionRepository
{
    /** @var array<string, Option> */
    private array $items = [];

    public function __construct(Option ...$options)
    {
        foreach ($options as $option) {
            $this->save($option);
        }
    }

    public function get(string $id): Option
    {
        return $this->items[$id] ?? throw new NotFound('Option introuvable.');
    }

    public function getMany(array $ids): array
    {
        return array_map($this->get(...), array_values(array_unique($ids)));
    }

    public function all(): array
    {
        $all = array_values($this->items);
        usort($all, static fn (Option $a, Option $b): int => [$a->position, $a->name] <=> [$b->position, $b->name]);

        return $all;
    }

    public function allActive(): array
    {
        $active = array_values(array_filter($this->items, static fn (Option $o): bool => $o->active));
        usort($active, static fn (Option $a, Option $b): int => [$a->position, $a->name] <=> [$b->position, $b->name]);

        return $active;
    }

    public function save(Option $option): void
    {
        $this->items[$option->id] = $option;
    }
}
