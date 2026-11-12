<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Fidelite\Domain\Model\CarteFidelite;
use Bsandoz\Core\Fidelite\Domain\Port\CartesFidelite;

final class InMemoryCartesFidelite implements CartesFidelite
{
    /** @var array<string, CarteFidelite> */
    private array $cartes = [];

    public function get(string $userId): ?CarteFidelite
    {
        return $this->cartes[$userId] ?? null;
    }

    public function save(CarteFidelite $carte): void
    {
        $this->cartes[$carte->userId()] = $carte;
    }
}
