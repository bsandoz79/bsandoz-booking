<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Model;

use Bsandoz\Core\Shared\Domain\Money;

/**
 * Une prestation vendue (ex. « Nettoyage intérieur »), avec ses tarifs par variante métier
 * et la liste des options autorisées (par identifiant, les options vivant à part).
 * Durée incertaine ($occupePlage) : la prestation occupe toute la plage d'ouverture (demi-journée) où elle commence.
 */
class Prestation
{
    /** @var array<string, Tarif> tarifs indexés par variante */
    private array $tarifs = [];

    /** @var list<string> identifiants des options autorisées */
    private array $optionIds = [];

    public function __construct(
        private string $id,
        private string $name,
        private Money $basePrice,
        private int $baseDurationMin,
        private string $description = '',
        private bool $active = true,
        private ?string $categoryId = null,
        private int $position = 0,
        private bool $occupePlage = false,
    ) {
    }

    public function id(): string { return $this->id; }
    public function name(): string { return $this->name; }
    public function description(): string { return $this->description; }
    public function basePrice(): Money { return $this->basePrice; }
    public function baseDurationMin(): int { return $this->baseDurationMin; }
    public function isActive(): bool { return $this->active; }
    public function categoryId(): ?string { return $this->categoryId; }
    public function position(): int { return $this->position; }
    /** Vrai si la durée est incertaine : la prestation bloque toute la demi-journée. */
    public function occupePlage(): bool { return $this->occupePlage; }

    public function addTarif(Tarif $tarif): void
    {
        $this->tarifs[$tarif->variante] = $tarif;
    }

    /** @return array<string, Tarif> */
    public function tarifs(): array
    {
        return $this->tarifs;
    }

    public function addOption(Option $option): void
    {
        if (!$this->allowsOption($option->id)) {
            $this->optionIds[] = $option->id;
        }
    }

    /** @return list<string> */
    public function optionIds(): array
    {
        return $this->optionIds;
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
        return in_array($optionId, $this->optionIds, true);
    }
}
