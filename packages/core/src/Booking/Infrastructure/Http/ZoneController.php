<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Bsandoz\Core\Booking\Application\EstimerDeplacement;
use Bsandoz\Core\Booking\Application\GererDisponibilites;
use Bsandoz\Core\Booking\Domain\Model\PalierDeplacement;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Informations publiques à afficher sur le site :
 *   GET /api/v1/booking/zone : {"surPlace": false, "freeRadiusKm", "maxDistanceKm", "pricePerKmCents", "roadFactor", "paliers": [{"jusquaKm", "prixCents"}]}
 *       ou {"surPlace": true}. Le point de départ n'est jamais publié (ce peut être l'adresse personnelle du pro).
 *       roadFactor : distance routière ÷ distance à vol d'oiseau, pour tracer les cercles de la carte ;
 *       rayonVilleKm : rayon de la ville de départ (distances comptées depuis sa limite).
 *   GET /api/v1/booking/zone/estimation?lat=&lng= : {"distanceKm", "dansZone", "fraisCents"} (même calcul que le devis),
 *       ou {"surPlace": true}. Position du visiteur utilisée pour le calcul seulement, jamais enregistrée.
 *   GET /api/v1/booking/hours : horaires d'ouverture [{"weekday" (1 = lundi … 7 = dimanche), "startsAt", "endsAt"}].
 */
final class ZoneController
{
    public function __construct(
        private SettingsProvider $settings,
        private GererDisponibilites $disponibilites,
        private EstimerDeplacement $estimer,
    )
    {
    }

    #[Route('/api/v1/booking/zone', name: 'bsandoz_booking_zone', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        $zone = $this->settings->zone();

        return self::publique($zone === null ? ['surPlace' => true] : [
            'surPlace' => false,
            'freeRadiusKm' => $zone->freeRadiusKm,
            'maxDistanceKm' => $zone->maxDistanceKm,
            'pricePerKmCents' => $zone->pricePerKm->cents,
            'roadFactor' => $zone->roadFactor,
            'rayonVilleKm' => $zone->rayonVilleKm,
            'paliers' => array_map(static fn (PalierDeplacement $p): array => ['jusquaKm' => $p->jusquaKm, 'prixCents' => $p->prix->cents], $zone->paliers),
        ]);
    }

    #[Route('/api/v1/booking/zone/estimation', name: 'bsandoz_booking_zone_estimation', methods: ['GET'])]
    public function estimation(Request $request): JsonResponse
    {
        $lat = filter_var($request->query->get('lat'), FILTER_VALIDATE_FLOAT);
        $lng = filter_var($request->query->get('lng'), FILTER_VALIDATE_FLOAT);
        if ($lat === false || $lng === false) {
            throw new InvalidRequest('Paramètres lat et lng attendus.');
        }
        $estimation = ($this->estimer)($lat, $lng);

        return new JsonResponse($estimation === null ? ['surPlace' => true] : [
            'distanceKm' => $estimation->distanceKm,
            'dansZone' => $estimation->inZone,
            'fraisCents' => $estimation->travelFee->cents,
        ]);
    }

    #[Route('/api/v1/booking/hours', name: 'bsandoz_booking_hours', methods: ['GET'])]
    public function horaires(): JsonResponse
    {
        return self::publique(array_map(
            static fn (array $h): array => ['weekday' => $h['weekday'], 'startsAt' => $h['startsAt'], 'endsAt' => $h['endsAt']],
            $this->disponibilites->horaires(),
        ));
    }

    /** @param array<mixed> $donnees */
    private static function publique(array $donnees): JsonResponse
    {
        $reponse = new JsonResponse($donnees);
        $reponse->setPublic();
        $reponse->setMaxAge(300);

        return $reponse;
    }
}
