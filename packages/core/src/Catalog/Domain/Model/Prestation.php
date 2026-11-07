<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Model;

use Bsandoz\Core\Shared\Domain\Money;

/** Une prestation vendue (ex. « Nettoyage intérieur »), avec ses tarifs par variante métier. */
class Prestation
{
    /** @var array<string, Tarif> tarifs indexés par variante */
    private array $tarifs = [];

    /** @var list<Option> */
    private array $options = [];

    public function __construct(
        private string $id,
        private string $name,
        private Money $basePrice,
        private int $baseDurationMin,
        private string $description = '',
        private bool $active = true,
        private ?string $categoryId = null,
        private int $position = 0,
    ) {
    }

    public function id(): string { return $this->id; }
    public function name(): string { return $this->name; }
    public function description(): string { return $this->description; }
    public function isActive(): bool { return $this->active; }
    public function categoryId(): ?string { return $this->categoryId; }
    public function position(): int { return $this->position; }

    public function addTarif(Tarif $tarif): void
    {
        $this->tarifs[$tarif->variante] = $tarif;
    }

    public function addOption(Option $option): void
    {
        $this->options[] = $option;
    }

    /** @return list<Option> */
    public function options(): array
    {
        return $this->options;
    }

    public function priceFor(?string $variante): Money
    {
        return $variante !== null && isset($this->tarifs[$variante]) ? $this->tarifs[$variante]->price : $this->basePrice;
    }

    public function durationFor(?string $variante): int
    {
        return $variante !== null && isset($this->tarifs[$variante]) ? $this->tarifs[$variante]->durationMin : $this->baseDurationMin;
    }

    public function allowsOption(string $optionId): bool
    {
        foreach ($this->options as $option) {
            if ($option->id === $optionId) {
                return true;
            }
        }
        return false;
    }
}
