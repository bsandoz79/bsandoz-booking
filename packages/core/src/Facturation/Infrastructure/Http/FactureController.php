<?php

declare(strict_types=1);

namespace Bsandoz\Core\Facturation\Infrastructure\Http;

use Bsandoz\Core\Auth\Infrastructure\Security\SecurityUser;
use Bsandoz\Core\Facturation\Application\ConsulterFactures;
use Bsandoz\Core\Facturation\Application\EmettreFacture;
use Bsandoz\Core\Facturation\Application\InfosFacturation;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Factures.
 *   Espace pro (ROLE_PRO) : GET /admin/factures, GET /admin/factures/{id}, POST /admin/reservations/{id}/facture (émet ou
 *   renvoie la facture d'une prestation faite), GET /admin/reservations/{id}/facture, GET / PUT /admin/settings/facturation.
 *   Espace client : GET /me/factures, GET /me/factures/{id}.
 */
final class FactureController
{
    public function __construct(
        private ConsulterFactures $consulter,
        private EmettreFacture $emettre,
        private InfosFacturation $infos,
    ) {
    }

    #[Route('/api/v1/admin/factures', name: 'bsandoz_admin_factures', methods: ['GET'])]
    #[IsGranted('ROLE_PRO')]
    public function toutes(): JsonResponse
    {
        return new JsonResponse($this->consulter->toutes());
    }

    #[Route('/api/v1/admin/factures/{id}', name: 'bsandoz_admin_facture', methods: ['GET'])]
    #[IsGranted('ROLE_PRO')]
    public function voirPro(string $id): JsonResponse
    {
        return new JsonResponse($this->consulter->voir($id));
    }

    #[Route('/api/v1/admin/reservations/{id}/facture', name: 'bsandoz_admin_reservation_facture', methods: ['POST'])]
    #[IsGranted('ROLE_PRO')]
    public function emettre(string $id): JsonResponse
    {
        $facture = ($this->emettre)($id);

        return new JsonResponse($this->consulter->voir($facture->id()), Response::HTTP_CREATED);
    }

    #[Route('/api/v1/admin/reservations/{id}/facture', name: 'bsandoz_admin_reservation_facture_lire', methods: ['GET'])]
    #[IsGranted('ROLE_PRO')]
    public function deLaReservation(string $id): JsonResponse
    {
        return new JsonResponse($this->consulter->deLaReservation($id));
    }

    #[Route('/api/v1/admin/settings/facturation', name: 'bsandoz_admin_facturation', methods: ['GET'])]
    #[IsGranted('ROLE_PRO')]
    public function infos(): JsonResponse
    {
        return new JsonResponse($this->infos->vendeur());
    }

    #[Route('/api/v1/admin/settings/facturation', name: 'bsandoz_admin_facturation_changer', methods: ['PUT'])]
    #[IsGranted('ROLE_PRO')]
    public function changer(Request $request): JsonResponse
    {
        return new JsonResponse($this->infos->changer(Json::corps($request)));
    }

    #[Route('/api/v1/me/factures', name: 'bsandoz_me_factures', methods: ['GET'])]
    public function mesFactures(#[CurrentUser] SecurityUser $user): JsonResponse
    {
        return new JsonResponse($this->consulter->duClient($user->id()));
    }

    #[Route('/api/v1/me/factures/{id}', name: 'bsandoz_me_facture', methods: ['GET'])]
    public function maFacture(string $id, #[CurrentUser] SecurityUser $user): JsonResponse
    {
        return new JsonResponse($this->consulter->voir($id, $user->id()));
    }
}
