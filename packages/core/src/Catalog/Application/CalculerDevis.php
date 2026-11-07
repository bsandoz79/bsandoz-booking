<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Application;

use Bsandoz\Core\Booking\Domain\Port\Geocoder;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Catalog\Domain\Model\Devis;
use Bsandoz\Core\Catalog\Domain\Port\OptionRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Catalog\Domain\Port\VarianteResolver;
use Bsandoz\Core\Catalog\Domain\Service\PrixCalculator;

/** Calcule un devis à partir de la configuration envoyée par le front. */
final class CalculerDevis
{
    public function __construct(
        private PrestationRepository $prestations,
        private OptionRepository $options,
        private VarianteResolver $varianteResolver,
        private ZoneCalculator $zone,
        private SettingsProvider $settings,
        private PrixCalculator $prix,
    ) {
    }

    /**
     * @param list<string> $optionIds
     * @param array<string, mixed> $metierData
     * @todo Résoudre la variante, charger options, calculer la zone (frais km, hors zone → DomainError), appeler PrixCalculator.
     */
    public function __invoke(string $prestationId, array $optionIds, array $metierData, ?float $lat, ?float $lng): Devis
    {
        throw new \LogicException('À implémenter');
    }
}
