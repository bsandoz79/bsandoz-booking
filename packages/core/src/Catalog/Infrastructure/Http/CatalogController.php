<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Infrastructure\Http;

use Bsandoz\Core\Catalog\Application\CalculerDevis;
use Bsandoz\Core\Catalog\Application\ListerCatalogue;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/v1')]
final class CatalogController
{
    #[Route('/catalog', methods: ['GET'])]
    public function catalog(ListerCatalogue $lister): JsonResponse
    {
        return new JsonResponse($lister());
    }

    /** @todo Valider le corps (DTO QuoteRequest), appeler CalculerDevis, sérialiser le Devis. */
    #[Route('/booking/quote', methods: ['POST'])]
    public function quote(Request $request, CalculerDevis $calculer): JsonResponse
    {
        throw new \LogicException('À implémenter');
    }
}
