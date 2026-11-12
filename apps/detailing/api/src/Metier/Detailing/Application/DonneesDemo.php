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
            'tres-sale-int' => ['name' => 'Poils d\'animaux ou véhicule très sale', 'description' => 'Supplément pour un intérieur demandant plus de temps.', 'priceCents' => 1000, 'durationMin' => 30],
            'tres-sale-ext' => ['name' => 'Véhicule très sale', 'description' => 'Supplément pour une carrosserie très encrassée.', 'priceCents' => 1000, 'durationMin' => 20],
            'teinture-tapis' => ['name' => 'Teinture des tapis', 'description' => 'Redonne leur couleur aux tapis de sol.', 'priceCents' => 1000, 'durationMin' => 30],
            'cuir-longue-duree' => ['name' => 'Protection longue durée des cuirs', 'description' => 'Soin nourrissant qui protège les cuirs dans le temps.', 'priceCents' => 1000, 'durationMin' => 15],
            'impermeabilisation' => ['name' => 'Imperméabilisation des textiles', 'description' => 'Protège sièges et moquettes des taches et liquides.', 'priceCents' => 1000, 'durationMin' => 15],
            'anti-buee' => ['name' => 'Traitement anti-buée', 'description' => 'Vitres intérieures traitées contre la buée.', 'priceCents' => 1000, 'durationMin' => 10],
        ];
    }

    /**
     * Prestations par catégorie (interieur, exterieur, optique, carte) ; `occupePlage` = durée incertaine (3 h 30 ou plus
     * selon l'état du véhicule) : la prestation bloque la demi-journée et n'est proposée qu'en début de demi-journée libre.
     *
     * @return list<array{name: string, description: string, category: string, occupePlage: bool, priceCents: int, durationMin: int, options: list<string>}>
     */
    public static function prestations(): array
    {
        $interieur = ['tres-sale-int', 'impermeabilisation', 'anti-buee', 'cuir-longue-duree'];

        return [
            ['name' => 'Intérieur Éclat', 'description' => 'Aspiration complète, surfaces nettoyées en profondeur, vitres intérieures, parfum d\'ambiance. Durée : 1 h à 1 h 30.', 'category' => 'interieur', 'occupePlage' => false, 'priceCents' => 2900, 'durationMin' => 90, 'options' => $interieur],
            ['name' => 'Intérieur Signature', 'description' => 'Éclat, plus shampoing des sièges, tapis et moquettes, coffre, contours de portes, pare-brise intérieur, entretien des cuirs et de l\'alcantara, imperméabilisation des textiles. Durée : 2 h 30 à 3 h 30.', 'category' => 'interieur', 'occupePlage' => true, 'priceCents' => 6900, 'durationMin' => 210, 'options' => $interieur],
            ['name' => 'Intérieur Excellence', 'description' => 'Signature, plus désinfection à la vapeur, joints rénovés, soin nourrissant des cuirs, protection des plastiques, ceintures, traitement anti-buée. Durée : 3 h 30 à 5 h.', 'category' => 'interieur', 'occupePlage' => true, 'priceCents' => 8900, 'durationMin' => 300, 'options' => ['tres-sale-int', 'teinture-tapis']],
            ['name' => 'Extérieur Éclat', 'description' => 'Prélavage à la mousse active, lavage à la main, séchage microfibre, vitres. Durée : 1 h à 1 h 30.', 'category' => 'exterieur', 'occupePlage' => false, 'priceCents' => 2500, 'durationMin' => 90, 'options' => ['tres-sale-ext']],
            ['name' => 'Extérieur Signature', 'description' => 'Éclat, plus jantes nettoyées en profondeur, passages de roues, séchage complet, pneus lustrés. Durée : 1 h 30 à 2 h.', 'category' => 'exterieur', 'occupePlage' => false, 'priceCents' => 4500, 'durationMin' => 120, 'options' => ['tres-sale-ext']],
            ['name' => 'Extérieur Excellence', 'description' => 'Signature, plus prélavage renforcé, joints de portes, démoustiquage, plastiques et joints extérieurs rénovés, dégoudronnage. Durée : 2 h 30 à 3 h 30.', 'category' => 'exterieur', 'occupePlage' => true, 'priceCents' => 7000, 'durationMin' => 210, 'options' => ['tres-sale-ext']],
            ['name' => 'Rénovation des phares', 'description' => 'Les deux phares retrouvent leur transparence, sans remplacement : meilleure visibilité et contrôle technique serein. Prix pour la paire.', 'category' => 'optique', 'occupePlage' => false, 'priceCents' => 4500, 'durationMin' => 60, 'options' => []],
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
