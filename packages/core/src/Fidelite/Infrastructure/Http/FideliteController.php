<?php

declare(strict_types=1);

namespace Bsandoz\Core\Fidelite\Infrastructure\Http;

use Bsandoz\Core\Auth\Infrastructure\Security\SecurityUser;
use Bsandoz\Core\Fidelite\Application\GererFidelite;
use Bsandoz\Core\Fidelite\Domain\Model\RegleFidelite;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Carte de fidélité.
 *   GET   /api/v1/fidelite                    (public)   → règle {actif, tamponsRequis, remisePercent}
 *   GET   /api/v1/me/fidelite                 (client)   → {actif, tampons, tamponsRequis, remisePercent, remiseDisponible}
 *   GET   /api/v1/admin/fidelite/{userId}     (pro)      → carte d'un client
 *   PATCH /api/v1/admin/fidelite/{userId}     (pro)      {"delta": ±n} → carte ajustée
 *   PUT   /api/v1/admin/settings/fidelite     (pro)      {actif, tamponsRequis, remisePercent} → règle
 */
final class FideliteController
{
    public function __construct(private GererFidelite $fidelite)
    {
    }

    #[Route('/api/v1/fidelite', name: 'bsandoz_fidelite_regle', methods: ['GET'])]
    public function regle(): JsonResponse
    {
        return new JsonResponse(self::vueRegle($this->fidelite->regle()));
    }

    #[Route('/api/v1/me/fidelite', name: 'bsandoz_me_fidelite', methods: ['GET'])]
    public function maCarte(#[CurrentUser] SecurityUser $user): JsonResponse
    {
        return new JsonResponse($this->fidelite->carte($user->id()));
    }

    #[Route('/api/v1/admin/fidelite/{userId}', name: 'bsandoz_admin_fidelite', methods: ['GET'])]
    #[IsGranted('ROLE_PRO')]
    public function carteClient(string $userId): JsonResponse
    {
        return new JsonResponse($this->fidelite->carte($userId));
    }

    #[Route('/api/v1/admin/fidelite/{userId}', name: 'bsandoz_admin_fidelite_ajuster', methods: ['PATCH'])]
    #[IsGranted('ROLE_PRO')]
    public function ajuster(string $userId, Request $request): JsonResponse
    {
        $delta = Json::corps($request)['delta'] ?? null;
        if (!is_int($delta)) {
            throw new InvalidRequest('« delta » doit être un nombre entier (ex. 1 ou -1).');
        }

        return new JsonResponse($this->fidelite->ajuster($userId, $delta));
    }

    #[Route('/api/v1/admin/settings/fidelite', name: 'bsandoz_admin_settings_fidelite', methods: ['PUT'])]
    #[IsGranted('ROLE_PRO')]
    public function modifierRegle(Request $request): JsonResponse
    {
        return new JsonResponse(self::vueRegle($this->fidelite->modifierRegle(Json::corps($request))));
    }

    /** @return array{actif: bool, tamponsRequis: int, remisePercent: int} */
    private static function vueRegle(RegleFidelite $r): array
    {
        return ['actif' => $r->actif, 'tamponsRequis' => $r->tamponsRequis, 'remisePercent' => $r->remisePercent];
    }
}
