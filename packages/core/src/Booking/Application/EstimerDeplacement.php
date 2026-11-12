<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Model\ZoneQuote;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Estimation des frais de déplacement pour une position (carte de la zone sur le site) : même calcul que le devis,
 * sans jamais révéler le point de départ du pro. Null si l'activité se fait sur place.
 */
final class EstimerDeplacement
{
    public function __construct(
        private SettingsProvider $settings,
        private ZoneCalculator $zoneCalculator,
    ) {
    }

    /** @throws DomainError coordonnées invalides */
    public function __invoke(float $lat, float $lng): ?ZoneQuote
    {
        if (!is_finite($lat) || !is_finite($lng) || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            throw new DomainError('Position invalide.');
        }
        $zone = $this->settings->zone();

        return $zone === null ? null : $this->zoneCalculator->quote($zone, $lat, $lng);
    }
}
