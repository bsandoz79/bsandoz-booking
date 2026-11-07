<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Application;

use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Catalog\Domain\Model\Devis;
use Bsandoz\Core\Catalog\Domain\Port\OptionRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Catalog\Domain\Port\VarianteResolver;
use Bsandoz\Core\Catalog\Domain\Service\PrixCalculator;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Calcule un devis à partir de la configuration envoyée par le front.
 *
 * Variante : celle que le module métier déduit des données métier ; à défaut, la variante
 * envoyée explicitement (le kit ne connaît que cette clé). Adresse hors zone : le devis est
 * renvoyé avec inZone = false et sans frais de déplacement (la réservation, elle, sera refusée).
 * Activité sur place (aucune zone configurée) : l'adresse éventuelle est ignorée, ni distance ni frais.
 */
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
     * @throws NotFound prestation ou option inconnue
     * @throws DomainError prestation inactive, option non autorisée
     */
    public function __invoke(
        string $prestationId,
        array $optionIds,
        array $metierData,
        ?float $lat,
        ?float $lng,
        ?string $variante = null,
    ): Devis {
        $prestation = $this->prestations->get($prestationId);
        $variante = $this->varianteResolver->resolve($metierData) ?? ($variante !== '' ? $variante : null);
        $options = $this->options->getMany($optionIds);

        $zone = $this->settings->zone();
        $zoneQuote = $zone !== null && $lat !== null && $lng !== null ? $this->zone->quote($zone, $lat, $lng) : null;

        $rules = $this->settings->rules();
        $devis = $this->prix->calculer(
            $prestation,
            $variante,
            $options,
            $zoneQuote->travelFee ?? Money::zero(),
            $rules->depositPercent,
            $rules->depositFixedCents !== null ? Money::cents($rules->depositFixedCents) : null,
        );

        return $zoneQuote === null ? $devis : $devis->withZone($zoneQuote->inZone, $zoneQuote->distanceKm, $zoneQuote->travelMinutes);
    }
}
