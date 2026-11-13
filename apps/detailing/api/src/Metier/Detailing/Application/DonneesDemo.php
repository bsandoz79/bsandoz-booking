<?php

declare(strict_types=1);

namespace App\Metier\Detailing\Application;

/**
 * Données de DÉMONSTRATION de Perfect Clean (mêmes valeurs que le front en mode démo).
 * Prestations et prix repris d'un artisan réel du secteur (nettoyage auto à domicile) ; un seul prix par formule,
 * quel que soit le véhicule. Les durées des soins à la carte et des options ne sont pas publiées : ce sont des
 * estimations [à confirmer] que l'artisan ajuste dans son espace pro.
 */
final class DonneesDemo
{
    /** @return array<string, array{name: string, description: string, priceCents: int, durationMin: int}> options, par clé */
    public static function options(): array
    {
        return [
            'poils' => ['name' => 'Poils d\'animaux', 'description' => 'Retrait des poils incrustés dans les sièges et les moquettes.', 'priceCents' => 1000, 'durationMin' => 30],
            'tres-sale-int' => ['name' => 'Véhicule très sale', 'description' => 'Supplément pour un intérieur demandant plus de temps.', 'priceCents' => 1000, 'durationMin' => 30],
            'desodorisant' => ['name' => 'Désodorisant Perfect Clean', 'description' => 'Désodorisant Perfect Clean laissé dans le véhicule.', 'priceCents' => 400, 'durationMin' => 0],
            'tres-sale-ext' => ['name' => 'Véhicule très sale', 'description' => 'Supplément pour une carrosserie très encrassée.', 'priceCents' => 1000, 'durationMin' => 20],
            'deuxieme-vehicule' => ['name' => 'Deuxième véhicule', 'description' => 'Rénovation des phares d\'un deuxième véhicule, le même jour.', 'priceCents' => 4000, 'durationMin' => 90],
        ];
    }

    /**
     * Prestations par catégorie (interieur, exterieur, optique, carte) ; `occupePlage` = durée incertaine (3 h 30 ou plus
     * selon l'état du véhicule) : la prestation bloque la demi-journée et n'est proposée qu'en début de demi-journée libre.
     *
     * @return list<array{name: string, description: string, category: string, occupePlage: bool, priceCents: int, durationMin: int, options: list<string>, badge?: string, remiseUniteCents?: int}>
     */
    public static function prestations(): array
    {
        $interieur = ['poils', 'tres-sale-int'];

        return [
            ['name' => 'Intérieur Éclat', 'description' => 'Nettoyage approfondi des surfaces, aspiration minutieuse de l\'habitacle, nettoyage des vitres intérieures, parfum d\'ambiance. Durée : 1 h à 1 h 30.', 'category' => 'interieur', 'occupePlage' => false, 'priceCents' => 2900, 'durationMin' => 90, 'options' => [...$interieur, 'desodorisant']],
            ['name' => 'Intérieur Signature', 'description' => 'Éclat, shampooing des tapis et moquettes, contours de portes (intérieur / extérieur / coffre), nettoyage du pare-brise intérieur, nettoyage du coffre, shampooing des sièges à l\'injecteur-extracteur, entretien des cuirs à la main, entretien de l\'alcantara à la main, imperméabilisation textile [Durée limitée], désodorisant Perfect Clean [Offert · durée limitée]. Durée : 2 h 30 à 3 h 30.', 'category' => 'interieur', 'occupePlage' => true, 'priceCents' => 6900, 'durationMin' => 150, 'options' => $interieur, 'badge' => 'Le plus choisi'],
            ['name' => 'Intérieur Excellence', 'description' => 'Signature, désinfection intégrale à la vapeur, rénovation et entretien des joints, soin nourrissant longue durée des cuirs, protection des plastiques, nettoyage des ceintures, traitement anti-buée [Nouveau], désodorisant Perfect Clean [Offert · durée limitée]. Durée : 3 h 30 à 5 h.', 'category' => 'interieur', 'occupePlage' => true, 'priceCents' => 8900, 'durationMin' => 210, 'options' => $interieur],
            ['name' => 'Extérieur Éclat', 'description' => 'Prélavage à la mousse active, lavage à la main, séchage microfibre, vitres. Durée : 1 h à 1 h 30.', 'category' => 'exterieur', 'occupePlage' => false, 'priceCents' => 2500, 'durationMin' => 90, 'options' => ['tres-sale-ext']],
            ['name' => 'Extérieur Signature', 'description' => 'Éclat, plus jantes nettoyées en profondeur, passages de roues, séchage complet, pneus lustrés. Durée : 1 h 30 à 2 h.', 'category' => 'exterieur', 'occupePlage' => false, 'priceCents' => 4500, 'durationMin' => 120, 'options' => ['tres-sale-ext']],
            ['name' => 'Extérieur Excellence', 'description' => 'Signature, plus prélavage renforcé, joints de portes, démoustiquage, plastiques et joints extérieurs rénovés, dégoudronnage. Durée : 2 h 30 à 3 h 30.', 'category' => 'exterieur', 'occupePlage' => true, 'priceCents' => 7000, 'durationMin' => 210, 'options' => ['tres-sale-ext']],
            ['name' => 'Rénovation des phares', 'description' => 'Les deux phares retrouvent leur transparence, sans remplacement : meilleure visibilité et contrôle technique serein. Prix pour la paire, 5 € de moins par véhicule supplémentaire. Durée : environ 1 h 30.', 'category' => 'optique', 'occupePlage' => false, 'priceCents' => 4500, 'durationMin' => 90, 'options' => [], 'remiseUniteCents' => 500],
            ['name' => 'Shampoing des sièges', 'description' => 'Sièges en tissu nettoyés à l\'injecteur-extracteur.', 'category' => 'carte', 'occupePlage' => false, 'priceCents' => 3900, 'durationMin' => 60, 'options' => []],
            ['name' => 'Nettoyage des cuirs', 'description' => 'Cuirs nettoyés et entretenus à la main.', 'category' => 'carte', 'occupePlage' => false, 'priceCents' => 3500, 'durationMin' => 60, 'options' => []],
            ['name' => 'Moquettes et tapis de sol', 'description' => 'Shampoing complet des moquettes et des tapis.', 'category' => 'carte', 'occupePlage' => false, 'priceCents' => 3500, 'durationMin' => 60, 'options' => []],
            ['name' => 'Ciel de toit', 'description' => 'Ciel de toit en textile nettoyé sans être détrempé.', 'category' => 'carte', 'occupePlage' => false, 'priceCents' => 3500, 'durationMin' => 45, 'options' => []],
            ['name' => 'Céramique vitres et pare-brise', 'description' => 'Traitement hydrophobe de toutes les vitres : la pluie glisse.', 'category' => 'carte', 'occupePlage' => false, 'priceCents' => 5900, 'durationMin' => 60, 'options' => []],
            ['name' => 'Céramique pare-brise', 'description' => 'Traitement hydrophobe du pare-brise seul.', 'category' => 'carte', 'occupePlage' => false, 'priceCents' => 3500, 'durationMin' => 30, 'options' => []],
            ['name' => 'Les 4 jantes', 'description' => 'Décontamination et brossage des quatre jantes.', 'category' => 'carte', 'occupePlage' => false, 'priceCents' => 2500, 'durationMin' => 30, 'options' => []],
            ['name' => 'Jantes et pneus', 'description' => 'Les quatre jantes et les pneus nettoyés en entier.', 'category' => 'carte', 'occupePlage' => false, 'priceCents' => 3000, 'durationMin' => 40, 'options' => []],
        ];
    }

    /**
     * Horaires d'ouverture : du lundi au samedi 8 h – 19 h, le dimanche 10 h – 18 h.
     *
     * @return list<array{weekday: int, startsAt: string, endsAt: string}>
     */
    public static function horaires(): array
    {
        $plages = [];
        foreach (range(1, 6) as $jour) {
            $plages[] = ['weekday' => $jour, 'startsAt' => '08:00', 'endsAt' => '19:00'];
        }
        $plages[] = ['weekday' => 7, 'startsAt' => '10:00', 'endsAt' => '18:00'];

        return $plages;
    }
}
