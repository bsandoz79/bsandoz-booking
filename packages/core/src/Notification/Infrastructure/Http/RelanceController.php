<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Http;

use Bsandoz\Core\Notification\Application\RelancerClients;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Relance automatique des clients.
 *   GET / PUT /api/v1/admin/settings/relance {actif, jours} (pro)
 *   POST /api/v1/relance/desinscription {u, s} (lien de l'e-mail) → 204, 404 si le lien est invalide
 */
final class RelanceController
{
    public function __construct(private RelancerClients $relance)
    {
    }

    #[Route('/api/v1/admin/settings/relance', name: 'bsandoz_admin_relance', methods: ['GET'])]
    #[IsGranted('ROLE_PRO')]
    public function voir(): JsonResponse
    {
        return new JsonResponse($this->relance->reglage());
    }

    #[Route('/api/v1/admin/settings/relance', name: 'bsandoz_admin_relance_changer', methods: ['PUT'])]
    #[IsGranted('ROLE_PRO')]
    public function changer(Request $request): JsonResponse
    {
        return new JsonResponse($this->relance->changer(Json::corps($request)));
    }

    #[Route('/api/v1/relance/desinscription', name: 'bsandoz_relance_desinscription', methods: ['POST'])]
    public function desinscrire(Request $request): Response
    {
        $corps = Json::corps($request);
        $this->relance->desinscrire(is_string($corps['u'] ?? null) ? $corps['u'] : '', is_string($corps['s'] ?? null) ? $corps['s'] : '');

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
