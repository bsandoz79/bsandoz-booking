<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Service;

use Bsandoz\Core\Catalog\Domain\Model\Devis;
use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/** Calcule le prix, la durée et l'acompte d'une demande. */
final class PrixCalculator
{
    /**
     * @param list<Option> $options
     * @param int|null $depositPercent acompte en % du total (prioritaire)
     * @param Money|null $depositFixed acompte fixe si pas de pourcentage
     */
    public function calculer(
        Prestation $prestation,
        ?string $variante,
        array $options,
        Money $travelFee,
        ?int $depositPercent,
        ?Money $depositFixed,
    ): Devis {
        if (!$prestation->isActive()) {
            throw new DomainError('Cette prestation n\'est plus disponible.');
        }

        $base = $prestation->priceFor($variante);
        $lines = [['label' => $prestation->name(), 'price' => $base]];
        $total = $base;
        $duration = $prestation->durationFor($variante);

        foreach ($options as $option) {
            if (!$option->active || !$prestation->allowsOption($option->id)) {
                throw new DomainError(sprintf('L\'option « %s » n\'est pas disponible pour cette prestation.', $option->name));
            }
            $lines[] = ['label' => $option->name, 'price' => $option->price];
            $total = $total->add($option->price);
            $duration += $option->durationMin;
        }

        if ($travelFee->cents > 0) {
            $lines[] = ['label' => 'Frais de déplacement', 'price' => $travelFee];
            $total = $total->add($travelFee);
        }

        $deposit = match (true) {
            $depositPercent !== null => $total->percent($depositPercent),
            $depositFixed !== null => $depositFixed->min($total),
            default => Money::zero(),
        };

        return new Devis($lines, $travelFee, $total, $deposit, $duration, $variante);
    }
}
