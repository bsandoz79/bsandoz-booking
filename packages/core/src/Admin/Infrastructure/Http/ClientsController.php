<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Infrastructure\Http;

use Bsandoz\Core\Admin\Application\FichesClients;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Fiches clients (ROLE_PRO).
 *   GET /api/v1/admin/clients             → [{userId, nom, email, phone, visites, depenseCents, derniereVisite, prochainRdv, aRelancer}]
 *   GET /api/v1/admin/clients/{id}        → résumé + panierMoyenCents, avoirCents, fidelite, historique
 *   PUT /api/v1/admin/clients/{id}/avoir {"avoirCents"} → {"avoirCents"}
 */
#[Route('/api/v1/admin/clients')]
#[IsGranted('ROLE_PRO')]
final class ClientsController
{
    public function __construct(private FichesClients $fiches)
    {
    }

    #[Route('', name: 'bsandoz_admin_clients', methods: ['GET'])]
    public function liste(): JsonResponse
    {
        return new JsonResponse($this->fiches->liste());
    }

    #[Route('/{id}', name: 'bsandoz_admin_client', methods: ['GET'])]
    public function fiche(string $id): JsonResponse
    {
        return new JsonResponse($this->fiches->fiche($id));
    }

    #[Route('/{id}/avoir', name: 'bsandoz_admin_client_avoir', methods: ['PUT'])]
    public function avoir(string $id, Request $request): JsonResponse
    {
        return new JsonResponse(['avoirCents' => $this->fiches->changerAvoir($id, Json::corps($request)['avoirCents'] ?? null)]);
    }
}
