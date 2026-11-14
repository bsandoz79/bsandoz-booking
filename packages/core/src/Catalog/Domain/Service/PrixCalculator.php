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
 * une fois par unité) ; le déplacement n'est compté qu'une fois. La remise par unité supplémentaire de la prestation
 * (ex. 5 € de moins dès le 2e véhicule) s'applique à chaque unité au-delà de la première, sans descendre sous zéro.
 *
 * Formule combinée : une prestation choisie dans chacune de ses catégories ; une ligne par prestation choisie, puis la
 * remise de la formule (jamais plus que la somme). Durée : somme des durées. Options : celles de la formule et celles
 * des prestations choisies.
 */
final class PrixCalculator
{
    public const QUANTITE_MAX = 5;

    /**
     * @param list<Option> $options options demandées, une entrée par unité concernée (doublons possibles)
     * @param int|null $depositPercent acompte en % du total (prioritaire)
     * @param Money|null $depositFixed acompte fixe si pas de pourcentage
     * @param list<Prestation> $composantes formule combinée : la prestation choisie dans chaque catégorie
     * @throws DomainError prestation inactive, quantité invalide, option non autorisée, choix incomplet pour une formule combinée
     */
    public function calculer(
        Prestation $prestation,
        ?string $variante,
        array $options,
        Money $travelFee,
        ?int $depositPercent,
        ?Money $depositFixed,
        int $quantite = 1,
        array $composantes = [],
    ): Devis {
        if (!$prestation->isActive()) {
            throw new DomainError('Cette prestation n\'est plus disponible.');
        }
        if ($quantite < 1 || $quantite > self::QUANTITE_MAX) {
            throw new DomainError(sprintf('La quantité doit être comprise entre 1 et %d.', self::QUANTITE_MAX));
        }
        $fois = static fn (string $label, int $n): string => $n > 1 ? sprintf('%s × %d', $label, $n) : $label;

        if ($prestation->estCombinee()) {
            $composantes = self::verifierComposantes($prestation, $composantes);
            $somme = Money::zero();
            $dureeUnite = 0;
            $lines = [];
            foreach ($composantes as $c) {
                $prix = $c->priceFor($variante);
                $somme = $somme->add($prix);
                $dureeUnite += $c->durationFor($variante);
                $lines[] = ['label' => $fois($c->name(), $quantite), 'price' => $prix->multiply($quantite)];
            }
            $remiseFormule = $prestation->remiseComposition()->min($somme);
            if ($remiseFormule->cents > 0) {
                $lines[] = ['label' => $fois(sprintf('Remise %s', $prestation->name()), $quantite), 'price' => $remiseFormule->multiply($quantite), 'deduction' => true];
            }
            $unite = $somme->subtract($remiseFormule);
        } else {
            if ($composantes !== []) {
                throw new DomainError('Cette prestation ne se compose pas : ne choisissez que la prestation elle-même.');
            }
            $unite = $prestation->priceFor($variante);
            $dureeUnite = $prestation->durationFor($variante);
            $lines = [['label' => $fois($prestation->name(), $quantite), 'price' => $unite->multiply($quantite)]];
        }
        $total = $unite->multiply($quantite);
        $remise = $prestation->remiseUniteSupplementaire()->min($unite);
        if ($quantite > 1 && $remise->cents > 0) {
            $moins = Money::cents($remise->cents * ($quantite - 1));
            $total = $total->subtract($moins);
            if ($prestation->estCombinee()) {
                $lines[] = ['label' => 'Remise véhicules supplémentaires', 'price' => $moins, 'deduction' => true];
            } else {
                $lines[0]['price'] = $total;
            }
        }
        $duration = $dureeUnite * $quantite;

        /** @var array<string, array{option: Option, nombre: int}> $parOption */
        $parOption = [];
        foreach ($options as $option) {
            $autorisee = $prestation->allowsOption($option->id)
                || array_filter($composantes, static fn (Prestation $c): bool => $c->allowsOption($option->id)) !== [];
            if (!$option->active || !$autorisee) {
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

    /**
     * Une prestation active et simple par catégorie de la formule, ni plus ni moins ; renvoyées dans l'ordre de la formule.
     *
     * @param list<Prestation> $composantes
     * @return list<Prestation>
     * @throws DomainError
     */
    private static function verifierComposantes(Prestation $formule, array $composantes): array
    {
        $parCategorie = [];
        foreach ($composantes as $c) {
            if (!$c->isActive() || $c->estCombinee()) {
                throw new DomainError(sprintf('« %s » ne peut pas faire partie de la formule %s.', $c->name(), $formule->name()));
            }
            $categorie = $c->categoryId();
            if ($categorie === null || !in_array($categorie, $formule->composition(), true) || isset($parCategorie[$categorie])) {
                throw new DomainError(sprintf('Formule %s : choisissez une seule prestation par catégorie.', $formule->name()));
            }
            $parCategorie[$categorie] = $c;
        }
        if (count($parCategorie) !== count($formule->composition())) {
            throw new DomainError(sprintf('Formule %s : choisissez une prestation dans chaque catégorie.', $formule->name()));
        }

        return array_map(static fn (string $categorie): Prestation => $parCategorie[$categorie], $formule->composition());
    }
}
