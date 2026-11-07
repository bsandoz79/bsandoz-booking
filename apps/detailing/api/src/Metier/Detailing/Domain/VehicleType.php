<?php

declare(strict_types=1);

namespace App\Metier\Detailing\Domain;

/** Types de véhicule, qui sont aussi les variantes de tarif côté kit. */
enum VehicleType: string
{
    case Citadine = 'citadine';
    case BerlineBreak = 'berline_break';
    case Suv = 'suv';
    case Utilitaire = 'utilitaire';

    public function label(): string
    {
        return match ($this) {
            self::Citadine => 'Citadine',
            self::BerlineBreak => 'Berline / Break',
            self::Suv => 'SUV / 4x4',
            self::Utilitaire => 'Utilitaire',
        };
    }
}
