<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Service;

use Bsandoz\Core\Catalog\Domain\Model\Devis;
use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Calcule le prix, la durée et l'acompte d'une demande.
 *
 * Quantité (ex. plusieurs véhicules) : la prestation est la même pour toutes les unités, multipliée en prix comme en
 * durée ; les options se choisissent unité par unité, chacune comptée autant de fois qu'elle est demandée (au plus
 * une fois par unité) ; le déplacement n'est compté qu'une fois.
 */
final class PrixCalculator
{
    public const QUANTITE_MAX = 5;

    /**
     * @param list<Option> $options options demandées, une entrée par unité concernée (doublons possibles)
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
        int $quantite = 1,
    ): Devis {
        if (!$prestation->isActive()) {
            throw new DomainError('Cette prestation n\'est plus disponible.');
        }
        if ($quantite < 1 || $quantite > self::QUANTITE_MAX) {
            throw new DomainError(sprintf('La quantité doit être comprise entre 1 et %d.', self::QUANTITE_MAX));
        }
        $fois = static fn (string $label, int $n): string => $n > 1 ? sprintf('%s × %d', $label, $n) : $label;

        $base = $prestation->priceFor($variante)->multiply($quantite);
        $lines = [['label' => $fois($prestation->name(), $quantite), 'price' => $base]];
        $total = $base;
        $duration = $prestation->durationFor($variante) * $quantite;

        /** @var array<string, array{option: Option, nombre: int}> $parOption */
        $parOption = [];
        foreach ($options as $option) {
            if (!$option->active || !$prestation->allowsOption($option->id)) {
                throw new DomainError(sprintf('L\'option « %s » n\'est pas disponible pour cette prestation.', $option->name));
            }
            $parOption[$option->id] = ['option' => $option, 'nombre' => ($parOption[$option->id]['nombre'] ?? 0) + 1];
        }
        foreach ($parOption as ['option' => $option, 'nombre' => $nombre]) {
            if ($nombre > $quantite) {
                throw new DomainError(sprintf('L\'option « %s » est demandée plus de fois que de prestations.', $option->name));
            }
            $prix = $option->price->multiply($nombre);
            $lines[] = ['label' => $fois($option->name, $nombre), 'price' => $prix];
            $total = $total->add($prix);
            $duration += $option->durationMin * $nombre;
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
