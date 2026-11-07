<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Model;

use Bsandoz\Core\Shared\Domain\Money;

/** Résultat d'un calcul de prix. */
final class Devis
{
    /**
     * @param list<array{label: string, price: Money}> $lines
     * @param bool $inZone faux si l'adresse est hors de la zone d'intervention (aucuns frais de déplacement comptés)
     * @param float|null $distanceKm distance routière estimée, si une adresse a été donnée
     * @param int $travelMinutes temps de trajet estimé depuis le point de départ du pro
     */
    public function __construct(
        public readonly array $lines,
        public readonly Money $travelFee,
        public readonly Money $total,
        public readonly Money $deposit,
        public readonly int $durationMin,
        public readonly ?string $variante = null,
        public readonly bool $inZone = true,
        public readonly ?float $distanceKm = null,
        public readonly int $travelMinutes = 0,
    ) {
    }

    public function withZone(bool $inZone, float $distanceKm, int $travelMinutes): self
    {
        return new self($this->lines, $this->travelFee, $this->total, $this->deposit, $this->durationMin, $this->variante, $inZone, $distanceKm, $travelMinutes);
    }
}
