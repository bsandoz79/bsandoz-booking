<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Bsandoz\Core\Booking\Domain\Model\PalierDeplacement;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * GET /api/v1/booking/zone (public) : conditions de déplacement à afficher sur le site.
 * {"surPlace": false, "freeRadiusKm", "maxDistanceKm", "pricePerKmCents", "paliers": [{"jusquaKm", "prixCents"}]}
 * ou {"surPlace": true}. Le point de départ n'est jamais publié (ce peut être l'adresse personnelle du pro).
 */
final class ZoneController
{
    public function __construct(private SettingsProvider $settings)
    {
    }

    #[Route('/api/v1/booking/zone', name: 'bsandoz_booking_zone', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        $zone = $this->settings->zone();
        $reponse = new JsonResponse($zone === null ? ['surPlace' => true] : [
            'surPlace' => false,
            'freeRadiusKm' => $zone->freeRadiusKm,
            'maxDistanceKm' => $zone->maxDistanceKm,
            'pricePerKmCents' => $zone->pricePerKm->cents,
            'paliers' => array_map(static fn (PalierDeplacement $p): array => ['jusquaKm' => $p->jusquaKm, 'prixCents' => $p->prix->cents], $zone->paliers),
        ]);
        $reponse->setPublic();
        $reponse->setMaxAge(300);

        return $reponse;
    }
}
