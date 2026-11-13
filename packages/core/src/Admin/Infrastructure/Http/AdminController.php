<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Infrastructure\Http;

use Bsandoz\Core\Admin\Application\GererReglages;
use Bsandoz\Core\Admin\Application\TableauDeBord;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Espace pro (ROLE_PRO) : tableau de bord et réglages.
 *   GET /api/v1/admin/dashboard
 *   GET /api/v1/admin/settings                  → {rules, zone, timezone}
 *   PUT /api/v1/admin/settings/rules {…}        → règles de réservation
 *   PUT /api/v1/admin/settings/zone {"zone": {…} | null}  (null : activité sur place)
 *   GET / PUT /api/v1/admin/settings/creneaux-groupes {"seuilMin": 0–240} (0 : pas de mise en avant)
 */
#[Route('/api/v1/admin')]
#[IsGranted('ROLE_PRO')]
final class AdminController
{
    public function __construct(
        private TableauDeBord $tableau,
        private GererReglages $reglages,
        private ?\Bsandoz\Core\Booking\Application\CreneauxGroupes $groupes = null,
    ) {
    }

    #[Route('/dashboard', name: 'bsandoz_admin_dashboard', methods: ['GET'])]
    public function dashboard(): JsonResponse
    {
        return new JsonResponse(($this->tableau)());
    }

    #[Route('/settings', name: 'bsandoz_admin_settings', methods: ['GET'])]
    public function settings(): JsonResponse
    {
        return new JsonResponse($this->reglages->lire());
    }

    #[Route('/settings/rules', name: 'bsandoz_admin_settings_rules', methods: ['PUT'])]
    public function rules(Request $request): JsonResponse
    {
        $this->reglages->modifierRegles(Json::corps($request));

        return new JsonResponse($this->reglages->lire());
    }

    #[Route('/settings/zone', name: 'bsandoz_admin_settings_zone', methods: ['PUT'])]
    public function zone(Request $request): JsonResponse
    {
        $body = Json::corps($request);
        if (!array_key_exists('zone', $body) || ($body['zone'] !== null && !is_array($body['zone']))) {
            throw new InvalidRequest('« zone » doit être un objet, ou null pour une activité sur place.');
        }
        /** @var array<string, mixed>|null $zone */
        $zone = $body['zone'];
        $this->reglages->modifierZone($zone);

        return new JsonResponse($this->reglages->lire());
    }

    #[Route('/settings/creneaux-groupes', name: 'bsandoz_admin_creneaux_groupes', methods: ['GET'])]
    public function creneauxGroupes(): JsonResponse
    {
        return new JsonResponse(['seuilMin' => $this->groupes?->seuilMin() ?? 0]);
    }

    #[Route('/settings/creneaux-groupes', name: 'bsandoz_admin_creneaux_groupes_changer', methods: ['PUT'])]
    public function changerCreneauxGroupes(Request $request): JsonResponse
    {
        if ($this->groupes === null) {
            throw new InvalidRequest('Réglage indisponible.');
        }

        return new JsonResponse(['seuilMin' => $this->groupes->changer(Json::corps($request)['seuilMin'] ?? null)]);
    }
}
