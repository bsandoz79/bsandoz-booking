<?php

declare(strict_types=1);

namespace App\Metier\Detailing\Application;

use Bsandoz\Core\Booking\Application\GererDisponibilites;
use Bsandoz\Core\Catalog\Application\GererCatalogue;
use Bsandoz\Core\Facturation\Application\InfosFacturation;

/**
 * Charge le catalogue et les horaires de démonstration via les cas d'usage du kit.
 * Ne fait rien si le catalogue contient déjà des prestations (aucune donnée réelle écrasée).
 */
final class ChargerDonneesDemo
{
    public function __construct(
        private GererCatalogue $catalogue,
        private GererDisponibilites $disponibilites,
        private ?InfosFacturation $facturation = null,
    ) {
    }

    /**
     * Vendeur des factures de démonstration (fictif, signalé comme tel) : seulement les champs encore « [à compléter] ».
     * Les informations déjà saisies par le pro ne sont jamais écrasées.
     */
    private function vendeurDemo(): void
    {
        if ($this->facturation === null) {
            return;
        }
        $actuel = $this->facturation->vendeur();
        $demo = DonneesDemo::vendeur();
        $valeurs = [];
        foreach ($actuel as $champ => $valeur) {
            $valeurs[$champ] = $valeur === InfosFacturation::A_COMPLETER && isset($demo[$champ]) ? $demo[$champ] : ($valeur === InfosFacturation::A_COMPLETER ? '' : $valeur);
        }
        $valeurs['siret'] = $actuel['siret'] === InfosFacturation::A_COMPLETER ? '' : $actuel['siret'];
        $this->facturation->changer($valeurs);
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
            $this->catalogue->enregistrerPrestation([
                'name' => $p['name'],
                'description' => $p['description'],
                'basePriceCents' => $p['priceCents'],
                'baseDurationMin' => $p['durationMin'],
                'active' => true,
                'categoryId' => $p['category'],
                'position' => $position,
                'occupePlage' => $p['occupePlage'],
                'badge' => $p['badge'] ?? null,
                'remiseUniteCents' => $p['remiseUniteCents'] ?? 0,
                'tarifs' => [],
                'optionIds' => array_map(static fn (string $cle): string => $ids[$cle], $p['options']),
                'composition' => $p['composition'] ?? [],
                'remiseCompositionCents' => $p['remiseCompositionCents'] ?? 0,
            ]);
        }

        $plages = $this->disponibilites->definirHoraires(DonneesDemo::horaires());

        $this->vendeurDemo();

        return ['charge' => true, 'prestations' => count($prestations), 'options' => count($ids), 'plages' => count($plages)];
    }

    /**
     * Catalogue déjà chargé : aligne les prestations de démonstration (retrouvées par leur nom) sur les données actuelles
     * (prix, durée, description, options proposées). Les options manquantes sont créées ; les anciennes options ne
     * sont plus proposées par ces prestations (gardées pour l'historique). Catégorie, position, activation et tarifs par
     * variante choisis par le pro sont conservés ; les autres prestations ne sont pas touchées.
     *
     * @return array{prestations: int, options: int}
     */
    public function mettreAJour(): array
    {
        $catalogue = $this->catalogue->lister();

        $ids = [];
        $creees = 0;
        foreach (DonneesDemo::options() as $cle => $option) {
            $existante = null;
            foreach ($catalogue['options'] as $o) {
                if (($o['name'] ?? null) === $option['name'] && ($o['description'] ?? null) === $option['description']) {
                    $existante = $o;
                    break;
                }
            }
            $id = is_string($existante['id'] ?? null) ? $existante['id'] : null;
            $creees += $id === null ? 1 : 0;
            $ids[$cle] = (string) $this->catalogue->enregistrerOption($option + ['active' => true], $id)['id'];
        }

        $alignees = 0;
        foreach (DonneesDemo::prestations() as $position => $p) {
            $trouvee = false;
            foreach ($catalogue['prestations'] as $existante) {
                if (($existante['name'] ?? null) !== $p['name'] || !is_string($existante['id'] ?? null)) {
                    continue;
                }
                $this->catalogue->enregistrerPrestation([
                    'name' => $p['name'],
                    'description' => $p['description'],
                    'basePriceCents' => $p['priceCents'],
                    'baseDurationMin' => $p['durationMin'],
                    'active' => $existante['active'] ?? true,
                    'categoryId' => $existante['categoryId'] ?? $p['category'],
                    'position' => $existante['position'] ?? 0,
                    'occupePlage' => $p['occupePlage'],
                    'badge' => $p['badge'] ?? null,
                    'remiseUniteCents' => $p['remiseUniteCents'] ?? 0,
                    'tarifs' => $existante['tarifs'] ?? [],
                    'optionIds' => array_map(static fn (string $cle): string => $ids[$cle], $p['options']),
                    'composition' => $p['composition'] ?? [],
                    'remiseCompositionCents' => $p['remiseCompositionCents'] ?? 0,
                ], $existante['id']);
                ++$alignees;
                $trouvee = true;
                break;
            }
            // Nouvelle prestation de la démo (ex. formule complète) : créée, à la suite des autres.
            if (!$trouvee) {
                $this->catalogue->enregistrerPrestation([
                    'name' => $p['name'], 'description' => $p['description'], 'basePriceCents' => $p['priceCents'], 'baseDurationMin' => $p['durationMin'],
                    'active' => true, 'categoryId' => $p['category'], 'position' => count($catalogue['prestations']) + $position, 'occupePlage' => $p['occupePlage'],
                    'badge' => $p['badge'] ?? null, 'remiseUniteCents' => $p['remiseUniteCents'] ?? 0, 'tarifs' => [],
                    'optionIds' => array_map(static fn (string $cle): string => $ids[$cle], $p['options']),
                    'composition' => $p['composition'] ?? [], 'remiseCompositionCents' => $p['remiseCompositionCents'] ?? 0,
                ]);
                ++$alignees;
            }
        }

        $this->vendeurDemo();

        return ['prestations' => $alignees, 'options' => $creees];
    }
}
