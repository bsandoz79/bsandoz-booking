<?php

declare(strict_types=1);

namespace App\Metier\Detailing\Domain;

use Bsandoz\Core\Catalog\Domain\Port\VarianteResolver;

/**
 * Traduit les données métier du formulaire en variante de tarif :
 *  - canapé : « canape_<places> » (2, 3, 4 et plus → canape_4) ;
 *  - véhicule : type choisi par le client, sinon déduit de la marque et du modèle.
 */
final class DetailingVarianteResolver implements VarianteResolver
{
    public function __construct(private VehicleModelCatalog $catalog)
    {
    }

    public function resolve(array $metierData): ?string
    {
        if (($metierData['category'] ?? null) === 'canape') {
            $places = max(2, min(4, (int) ($metierData['seats'] ?? 3)));

            return 'canape_' . $places;
        }

        $chosen = $metierData['vehicleType'] ?? null;
        if (is_string($chosen) && VehicleType::tryFrom($chosen) !== null) {
            return $chosen;
        }

        $brand = (string) ($metierData['brand'] ?? '');
        $model = (string) ($metierData['model'] ?? '');

        return $this->catalog->typeOf($brand, $model)?->value;
    }
}
