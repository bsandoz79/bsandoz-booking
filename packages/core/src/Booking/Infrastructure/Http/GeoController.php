<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Bsandoz\Core\Booking\Application\RechercherAdresse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** GET /api/v1/geo/search?q=12 rue&limit=5 → [{"label", "lat", "lng"}] (liste vide en dessous de 3 caractères). */
final class GeoController
{
    public function __construct(private RechercherAdresse $rechercher)
    {
    }

    #[Route('/api/v1/geo/search', name: 'bsandoz_geo_search', methods: ['GET'])]
    public function search(Request $request): JsonResponse
    {
        $query = $request->query->get('q');
        $limit = filter_var($request->query->get('limit', '5'), FILTER_VALIDATE_INT, ['options' => ['default' => 5]]);

        return new JsonResponse(($this->rechercher)(is_string($query) ? $query : '', $limit));
    }
}
