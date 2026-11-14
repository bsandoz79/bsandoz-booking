<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Infrastructure\Http;

use Bsandoz\Core\Abonnement\Application\AbonnementsClient;
use Bsandoz\Core\Abonnement\Application\GererAbonnementsPro;
use Bsandoz\Core\Auth\Infrastructure\Security\SecurityUser;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Abonnements (accès par chemin : /me pour le client connecté, /admin pour le pro, voir security.yaml).
 *   GET  /api/v1/abonnements/offres                 → offres proposées (public)
 *   GET  /api/v1/me/abonnements                     → mes abonnements (période en cours, prestation réservée ou non)
 *   POST /api/v1/me/abonnements {"offreId"}         → 201 {"url"} : paiement de la première période
 *   POST /api/v1/me/abonnements/{id}/resilier       → 204 (effet à la fin de la période payée)
 *   GET  /api/v1/admin/abonnements/offres           → toutes les offres ; POST (création) ; PUT …/{id} (modification)
 *   GET  /api/v1/admin/abonnements                  → abonnés
 */
final class AbonnementController
{
    public function __construct(private AbonnementsClient $client, private GererAbonnementsPro $pro)
    {
    }

    #[Route('/api/v1/abonnements/offres', name: 'bsandoz_abonnements_offres', methods: ['GET'])]
    public function offres(): JsonResponse
    {
        return new JsonResponse($this->client->offres());
    }

    #[Route('/api/v1/me/abonnements', name: 'bsandoz_me_abonnements', methods: ['GET'])]
    public function mesAbonnements(#[CurrentUser] SecurityUser $user): JsonResponse
    {
        return new JsonResponse($this->client->mesAbonnements($user->id()));
    }

    #[Route('/api/v1/me/abonnements', name: 'bsandoz_me_abonnement_souscrire', methods: ['POST'])]
    public function souscrire(#[CurrentUser] SecurityUser $user, Request $request): JsonResponse
    {
        $offreId = Json::corps($request)['offreId'] ?? null;
        if (!is_string($offreId) || $offreId === '') {
            throw new InvalidRequest('« offreId » est obligatoire.');
        }

        return new JsonResponse(['url' => $this->client->souscrire($user->id(), $offreId)], Response::HTTP_CREATED);
    }

    #[Route('/api/v1/me/abonnements/{id}/resilier', name: 'bsandoz_me_abonnement_resilier', methods: ['POST'])]
    public function resilier(#[CurrentUser] SecurityUser $user, string $id): Response
    {
        $this->client->resilier($user->id(), $id);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/v1/admin/abonnements/offres', name: 'bsandoz_admin_abonnements_offres', methods: ['GET'])]
    public function offresPro(): JsonResponse
    {
        return new JsonResponse($this->pro->offres());
    }

    #[Route('/api/v1/admin/abonnements/offres', name: 'bsandoz_admin_abonnement_offre_creer', methods: ['POST'])]
    public function creerOffre(Request $request): JsonResponse
    {
        return new JsonResponse($this->pro->enregistrer(Json::corps($request)), Response::HTTP_CREATED);
    }

    #[Route('/api/v1/admin/abonnements/offres/{id}', name: 'bsandoz_admin_abonnement_offre_modifier', methods: ['PUT'])]
    public function modifierOffre(string $id, Request $request): JsonResponse
    {
        return new JsonResponse($this->pro->enregistrer(Json::corps($request), $id));
    }

    #[Route('/api/v1/admin/abonnements', name: 'bsandoz_admin_abonnes', methods: ['GET'])]
    public function abonnes(): JsonResponse
    {
        return new JsonResponse($this->pro->abonnes());
    }
}
