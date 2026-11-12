<?php

declare(strict_types=1);

namespace App\Metier\Detailing\Application;

use Bsandoz\Core\Booking\Application\GererDisponibilites;
use Bsandoz\Core\Catalog\Application\GererCatalogue;

/**
 * Charge le catalogue et les horaires de démonstration via les cas d'usage du kit.
 * Ne fait rien si le catalogue contient déjà des prestations (aucune donnée réelle écrasée).
 */
final class ChargerDonneesDemo
{
    public function __construct(
        private GererCatalogue $catalogue,
        private GererDisponibilites $disponibilites,
    ) {
    }

    /** @return array{charge: bool, prestations: int, options: int, plages: int} */
    public function __invoke(): array
    {
        if ($this->catalogue->lister()['prestations'] !== []) {
            return ['charge' => false, 'prestations' => 0, 'options' => 0, 'plages' => 0];
        }

        $ids = [];
        foreach (DonneesDemo::options() as $cle => $option) {
            $ids[$cle] = (string) $this->catalogue->enregistrerOption($option + ['active' => true])['id'];
        }

        $prestations = DonneesDemo::prestations();
        foreach ($prestations as $position => $p) {
            $premier = reset($p['tarifs']);
            $this->catalogue->enregistrerPrestation([
                'name' => $p['name'],
                'description' => $p['description'],
                'basePriceCents' => $premier['priceCents'],
                'baseDurationMin' => $premier['durationMin'],
                'active' => true,
                'categoryId' => $p['category'],
                'position' => $position,
                'occupePlage' => $p['occupePlage'],
                'tarifs' => $p['tarifs'],
                'optionIds' => array_map(static fn (string $cle): string => $ids[$cle], $p['options']),
            ]);
        }

        $plages = $this->disponibilites->definirHoraires(DonneesDemo::horaires());

        return ['charge' => true, 'prestations' => count($prestations), 'options' => count($ids), 'plages' => count($plages)];
    }
}
