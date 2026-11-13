<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Infrastructure\Http;

use Bsandoz\Core\Catalog\Application\GererCatalogue;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Catalogue dans l'espace pro (ROLE_PRO) :
 *   GET    /api/v1/admin/catalog                       → {prestations, options, produits} (actifs ou non)
 *   POST   /api/v1/admin/catalog/prestations  {…}      → 201 ; PUT …/prestations/{id} ; DELETE …/prestations/{id} (désactive)
 *   POST   /api/v1/admin/catalog/options      {…}      → 201 ; PUT …/options/{id}
 *   POST   /api/v1/admin/catalog/produits     {…}      → 201 ; PUT …/produits/{id} ; DELETE …/produits/{id} (retire de la vente)
 */
#[Route('/api/v1/admin/catalog')]
#[IsGranted('ROLE_PRO')]
final class AdminCatalogueController
{
    public function __construct(private GererCatalogue $catalogue)
    {
    }

    #[Route('', name: 'bsandoz_admin_catalog', methods: ['GET'])]
    public function lister(): JsonResponse
    {
        return new JsonResponse($this->catalogue->lister());
    }

    #[Route('/prestations', name: 'bsandoz_admin_prestation_create', methods: ['POST'])]
    public function creerPrestation(Request $request): JsonResponse
    {
        return new JsonResponse($this->catalogue->enregistrerPrestation(Json::corps($request)), Response::HTTP_CREATED);
    }

    #[Route('/prestations/{id}', name: 'bsandoz_admin_prestation_update', methods: ['PUT'])]
    public function modifierPrestation(string $id, Request $request): JsonResponse
    {
        return new JsonResponse($this->catalogue->enregistrerPrestation(Json::corps($request), $id));
    }

    #[Route('/prestations/{id}', name: 'bsandoz_admin_prestation_disable', methods: ['DELETE'])]
    public function desactiverPrestation(string $id): Response
    {
        $this->catalogue->desactiverPrestation($id);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/options', name: 'bsandoz_admin_option_create', methods: ['POST'])]
    public function creerOption(Request $request): JsonResponse
    {
        return new JsonResponse($this->catalogue->enregistrerOption(Json::corps($request)), Response::HTTP_CREATED);
    }

    #[Route('/options/{id}', name: 'bsandoz_admin_option_update', methods: ['PUT'])]
    public function modifierOption(string $id, Request $request): JsonResponse
    {
        return new JsonResponse($this->catalogue->enregistrerOption(Json::corps($request), $id));
    }

    #[Route('/produits', name: 'bsandoz_admin_produit_create', methods: ['POST'])]
    public function creerProduit(Request $request): JsonResponse
    {
        return new JsonResponse($this->catalogue->enregistrerProduit(Json::corps($request)), Response::HTTP_CREATED);
    }

    #[Route('/produits/{id}', name: 'bsandoz_admin_produit_update', methods: ['PUT'])]
    public function modifierProduit(string $id, Request $request): JsonResponse
    {
        return new JsonResponse($this->catalogue->enregistrerProduit(Json::corps($request), $id));
    }

    /** Suppression définitive (DELETE /produits/{id} seul : retiré de la vente, gardé). */
    #[Route('/produits/{id}/definitif', name: 'bsandoz_admin_produit_delete', methods: ['DELETE'])]
    public function supprimerProduit(string $id): Response
    {
        $this->catalogue->supprimerProduit($id);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/produits/{id}', name: 'bsandoz_admin_produit_disable', methods: ['DELETE'])]
    public function retirerProduit(string $id): Response
    {
        $this->catalogue->retirerProduit($id);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
