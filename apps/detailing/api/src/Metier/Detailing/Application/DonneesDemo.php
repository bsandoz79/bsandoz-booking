<?php

declare(strict_types=1);

namespace App\Metier\Detailing\Application;

/**
 * Données de DÉMONSTRATION d'Atelier Brillance (mêmes valeurs que le front en mode démo).
 * Les vrais prix, durées et horaires sont saisis ensuite par l'artisan dans son espace pro.
 */
final class DonneesDemo
{
    /** @return array<string, array{name: string, description: string, priceCents: int, durationMin: int}> options, par clé */
    public static function options(): array
    {
        return [
            'poils' => ['name' => 'Poils d\'animaux', 'description' => 'Retrait minutieux des poils incrustés.', 'priceCents' => 1500, 'durationMin' => 30],
            'sieges' => ['name' => 'Shampoing des sièges', 'description' => 'Tissus nettoyés en profondeur.', 'priceCents' => 2500, 'durationMin' => 30],
            'jantes' => ['name' => 'Jantes et pneus', 'description' => 'Décontamination et brillant pneus.', 'priceCents' => 1500, 'durationMin' => 20],
            'odeur' => ['name' => 'Traitement des odeurs', 'description' => 'Neutralise tabac et humidité.', 'priceCents' => 2000, 'durationMin' => 15],
        ];
    }

    /**
     * Prestations ; `occupePlage` = durée incertaine : la prestation bloque la demi-journée entière
     * et n'est proposée qu'en début de demi-journée libre.
     *
     * @return list<array{name: string, description: string, category: string, occupePlage: bool, tarifs: non-empty-array<string, array{priceCents: int, durationMin: int}>, options: list<string>}>
     */
    public static function prestations(): array
    {
        return [
            ['name' => 'Intérieur', 'description' => 'Aspiration, plastiques, vitres intérieures, tapis.', 'category' => 'auto', 'occupePlage' => false, 'tarifs' => self::parVehicule(6900, 7900, 8900, 9900, 90), 'options' => ['poils', 'sieges', 'odeur']],
            ['name' => 'Extérieur', 'description' => 'Lavage à la main, jantes, vitres, cire de protection.', 'category' => 'auto', 'occupePlage' => false, 'tarifs' => self::parVehicule(4900, 5900, 6900, 7900, 60), 'options' => ['jantes', 'odeur']],
            ['name' => 'Complet', 'description' => 'Intérieur et extérieur en une seule intervention.', 'category' => 'auto', 'occupePlage' => true, 'tarifs' => self::parVehicule(10900, 12900, 14900, 16900, 150), 'options' => ['poils', 'sieges', 'jantes', 'odeur']],
            ['name' => 'Nettoyage de canapé', 'description' => 'Injection-extraction, détachage, séchage rapide.', 'category' => 'canape', 'occupePlage' => false, 'tarifs' => [
                'canape_2' => ['priceCents' => 6900, 'durationMin' => 60],
                'canape_3' => ['priceCents' => 8900, 'durationMin' => 75],
                'canape_4' => ['priceCents' => 10900, 'durationMin' => 90],
            ], 'options' => ['odeur']],
        ];
    }

    /**
     * Horaires d'ouverture : du lundi au vendredi matin et après-midi, le samedi matin.
     *
     * @return list<array{weekday: int, startsAt: string, endsAt: string}>
     */
    public static function horaires(): array
    {
        $plages = [];
        foreach (range(1, 5) as $jour) {
            $plages[] = ['weekday' => $jour, 'startsAt' => '08:00', 'endsAt' => '12:00'];
            $plages[] = ['weekday' => $jour, 'startsAt' => '13:30', 'endsAt' => '18:00'];
        }
        $plages[] = ['weekday' => 6, 'startsAt' => '08:00', 'endsAt' => '12:00'];

        return $plages;
    }

    /** @return non-empty-array<string, array{priceCents: int, durationMin: int}> */
    private static function parVehicule(int $citadine, int $berline, int $suv, int $utilitaire, int $duree): array
    {
        return [
            'citadine' => ['priceCents' => $citadine, 'durationMin' => $duree],
            'berline_break' => ['priceCents' => $berline, 'durationMin' => $duree + 15],
            'suv' => ['priceCents' => $suv, 'durationMin' => $duree + 30],
            'utilitaire' => ['priceCents' => $utilitaire, 'durationMin' => $duree + 45],
        ];
    }
}
