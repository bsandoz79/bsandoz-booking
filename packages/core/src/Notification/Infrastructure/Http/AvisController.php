<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Http;

use Bsandoz\Core\Notification\Application\DemandeAvis;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/** Demande d'avis (pro) : GET / PUT /api/v1/admin/settings/avis {actif, lien}. */
#[IsGranted('ROLE_PRO')]
final class AvisController
{
    public function __construct(private DemandeAvis $avis)
    {
    }

    #[Route('/api/v1/admin/settings/avis', name: 'bsandoz_admin_avis', methods: ['GET'])]
    public function voir(): JsonResponse
    {
        return new JsonResponse($this->avis->reglage());
    }

    #[Route('/api/v1/admin/settings/avis', name: 'bsandoz_admin_avis_changer', methods: ['PUT'])]
    public function changer(Request $request): JsonResponse
    {
        return new JsonResponse($this->avis->changer(Json::corps($request)));
    }
}
