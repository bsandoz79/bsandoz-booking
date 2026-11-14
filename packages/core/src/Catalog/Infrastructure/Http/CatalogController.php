<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Infrastructure\Http;

use Bsandoz\Core\Catalog\Application\CalculerDevis;
use Bsandoz\Core\Catalog\Application\ListerCatalogue;
use Bsandoz\Core\Catalog\Domain\Model\Devis;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** Catalogue public et devis. Aucun accès Doctrine ici : uniquement les cas d'usage. */
#[Route('/api/v1')]
final class CatalogController
{
    public function __construct(
        private ListerCatalogue $lister,
        private CalculerDevis $calculer,
    ) {
    }

    #[Route('/catalog', name: 'bsandoz_catalog', methods: ['GET'])]
    public function catalog(): JsonResponse
    {
        return new JsonResponse(($this->lister)());
    }

    #[Route('/booking/quote', name: 'bsandoz_booking_quote', methods: ['POST'])]
    public function quote(Request $request): JsonResponse
    {
        $q = QuoteRequest::fromRequest($request);

        return new JsonResponse(self::devis(($this->calculer)($q->prestationId, $q->optionIds, $q->metierData, $q->lat, $q->lng, $q->variante, $q->quantite, $q->composantes)));
    }

    /** @return array<string, mixed> montants en centimes, comme attendu par le front */
    private static function devis(Devis $devis): array
    {
        return [
            'lines' => array_map(static fn (array $line): array => ['label' => $line['label'], 'amountCents' => ($line['deduction'] ?? false) ? -$line['price']->cents : $line['price']->cents], $devis->lines),
            'totalCents' => $devis->total->cents,
            'depositCents' => $devis->deposit->cents,
            'durationMin' => $devis->durationMin,
            'travelFeeCents' => $devis->travelFee->cents,
            'inZone' => $devis->inZone,
            'distanceKm' => $devis->distanceKm,
            'travelMinutes' => $devis->travelMinutes,
            'variante' => $devis->variante,
        ];
    }
}
