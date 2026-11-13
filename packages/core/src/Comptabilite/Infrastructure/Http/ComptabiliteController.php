<?php

declare(strict_types=1);

namespace Bsandoz\Core\Comptabilite\Infrastructure\Http;

use Bsandoz\Core\Comptabilite\Application\GererComptabilite;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Comptabilité simple (ROLE_PRO).
 *   GET    /api/v1/admin/comptabilite?annee=AAAA → {annee, mois: [{mois, chiffreAffairesCents, depensesCents, resultatCents}], totaux, depenses}
 *   POST   /api/v1/admin/depenses {le, libelle, montantCents, mensuelle} → 201 dépense
 *   DELETE /api/v1/admin/depenses/{id} → 204 (mensuelle déjà commencée : arrêtée ce mois-ci)
 */
#[IsGranted('ROLE_PRO')]
final class ComptabiliteController
{
    public function __construct(private GererComptabilite $comptabilite, private Clock $clock)
    {
    }

    #[Route('/api/v1/admin/comptabilite', name: 'bsandoz_admin_comptabilite', methods: ['GET'])]
    public function bilan(Request $request): JsonResponse
    {
        $annee = $request->query->getInt('annee', (int) $this->clock->now()->format('Y'));

        return new JsonResponse($this->comptabilite->bilan($annee));
    }

    #[Route('/api/v1/admin/depenses', name: 'bsandoz_admin_depense_ajouter', methods: ['POST'])]
    public function ajouter(Request $request): JsonResponse
    {
        return new JsonResponse($this->comptabilite->ajouter(Json::corps($request)), Response::HTTP_CREATED);
    }

    #[Route('/api/v1/admin/depenses/{id}', name: 'bsandoz_admin_depense_retirer', methods: ['DELETE'])]
    public function retirer(string $id): Response
    {
        $this->comptabilite->retirer($id);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
