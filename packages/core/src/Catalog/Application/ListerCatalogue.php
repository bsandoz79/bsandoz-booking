<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Application;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Port\OptionRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;

/**
 * Renvoie le catalogue public : prestations actives (« formules ») avec leurs tarifs par variante,
 * et les options actives proposées par au moins une de ces prestations.
 *
 * @phpstan-type Formule array{id: string, category: string|null, name: string, description: string, basePriceCents: int, baseDurationMin: int, occupePlage: bool, tarifs: array<string, array{priceCents: int, durationMin: int}>, optionIds: list<string>}
 * @phpstan-type OptionItem array{id: string, name: string, description: string, priceCents: int, durationMin: int}
 */
final class ListerCatalogue
{
    public function __construct(
        private PrestationRepository $prestations,
        private OptionRepository $options,
    ) {
    }

    /** @return array{formules: list<Formule>, options: list<OptionItem>} */
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

        return ['formules' => $formules, 'options' => $options];
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
