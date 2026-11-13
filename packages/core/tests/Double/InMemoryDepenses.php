<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Comptabilite\Domain\Model\Depense;
use Bsandoz\Core\Comptabilite\Domain\Port\Depenses;
use Bsandoz\Core\Shared\Domain\NotFound;

final class InMemoryDepenses implements Depenses
{
    /** @var array<string, Depense> */
    private array $items = [];

    public function get(string $id): Depense
    {
        return $this->items[$id] ?? throw new NotFound('Dépense introuvable.');
    }

    public function toutes(): array
    {
        $liste = array_values($this->items);
        usort($liste, static fn (Depense $a, Depense $b): int => $b->le() <=> $a->le());

        return $liste;
    }

    public function save(Depense $depense): void
    {
        $this->items[$depense->id()] = $depense;
    }

    public function supprimer(Depense $depense): void
    {
        unset($this->items[$depense->id()]);
    }
}
