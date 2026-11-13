<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Application;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Model\Produit;
use Bsandoz\Core\Catalog\Domain\Port\OptionRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Catalog\Domain\Port\ProduitRepository;

/**
 * Renvoie le catalogue public : prestations actives (« formules ») avec leurs tarifs par variante,
 * les options actives proposées par au moins une de ces prestations, et les produits actifs, épuisés compris (stock 0 :
 * affichés « épuisé », non commandables ;
 * `stock` sert de quantité maximale à proposer).
 *
 * @phpstan-type Formule array{id: string, category: string|null, name: string, description: string, basePriceCents: int, baseDurationMin: int, occupePlage: bool, badge: string|null, remiseUniteCents: int, tarifs: array<string, array{priceCents: int, durationMin: int}>, optionIds: list<string>}
 * @phpstan-type OptionItem array{id: string, name: string, description: string, priceCents: int, durationMin: int}
 * @phpstan-type ProduitItem array{id: string, name: string, description: string, priceCents: int, stock: int, photo: string|null, category: string|null}
 */
final class ListerCatalogue
{
    public function __construct(
        private PrestationRepository $prestations,
        private OptionRepository $options,
        private ?ProduitRepository $produits = null,
    ) {
    }

    /** @return array{formules: list<Formule>, options: list<OptionItem>, produits: list<ProduitItem>} */
    public function __invoke(): array
    {
        $activeOptions = [];
        foreach ($this->options->allActive() as $option) {
            $activeOptions[$option->id] = $option;
        }

        $formules = [];
        $proposed = [];
        foreach ($this->prestations->allActive() as $prestation) {
            $optionIds = array_values(array_filter($prestation->optionIds(), static fn (string $id): bool => isset($activeOptions[$id])));
            foreach ($optionIds as $id) {
                $proposed[$id] = true;
            }
            $formules[] = $this->formule($prestation, $optionIds);
        }

        $options = [];
        foreach ($activeOptions as $id => $option) {
            if (isset($proposed[$id])) {
                $options[] = $this->option($option);
            }
        }

        $produits = [];
        foreach ($this->produits?->all() ?? [] as $p) {
            if (!$p->actif()) {
                continue;
            }
            // Stock réel (« il en reste 2 », « épuisé ») ; la quantité par réservation reste limitée à Produit::QUANTITE_MAX.
            $produits[] = ['id' => $p->id(), 'name' => $p->nom(), 'description' => $p->description(), 'priceCents' => $p->prix()->cents,
                'stock' => $p->stock(), 'photo' => $p->photo(), 'category' => $p->categorie()];
        }

        return ['formules' => $formules, 'options' => $options, 'produits' => $produits];
    }

    /**
     * @param list<string> $optionIds
     * @return Formule
     */
    private function formule(Prestation $prestation, array $optionIds): array
    {
        $tarifs = [];
        foreach ($prestation->tarifs() as $variante => $tarif) {
            $tarifs[$variante] = ['priceCents' => $tarif->price->cents, 'durationMin' => $tarif->durationMin];
        }

        return [
            'id' => $prestation->id(),
            'category' => $prestation->categoryId(),
            'name' => $prestation->name(),
            'description' => $prestation->description(),
            'basePriceCents' => $prestation->basePrice()->cents,
            'baseDurationMin' => $prestation->baseDurationMin(),
            'occupePlage' => $prestation->occupePlage(),
            'badge' => $prestation->badge(),
            'remiseUniteCents' => $prestation->remiseUniteSupplementaire()->cents,
            'tarifs' => $tarifs,
            'optionIds' => $optionIds,
        ];
    }

    /** @return OptionItem */
    private function option(Option $option): array
    {
        return [
            'id' => $option->id,
            'name' => $option->name,
            'description' => $option->description,
            'priceCents' => $option->price->cents,
            'durationMin' => $option->durationMin,
        ];
    }
}
