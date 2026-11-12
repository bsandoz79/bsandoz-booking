<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Http;

use Bsandoz\Core\Auth\Infrastructure\Security\SecurityUser;
use Bsandoz\Core\Notification\Application\GererAbonnementsPush;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\Json;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Notifications push du pro. GET /push/key : clé publique VAPID (null si non configuré).
 * POST /admin/push : abonne l'appareil (corps = PushSubscription du navigateur, {endpoint, keys: {p256dh, auth}}) ;
 * DELETE /admin/push {endpoint} : le désabonne.
 */
final class PushController
{
    public function __construct(private GererAbonnementsPush $gerer)
    {
    }

    #[Route('/api/v1/push/key', name: 'bsandoz_push_key', methods: ['GET'])]
    public function cle(): JsonResponse
    {
        return new JsonResponse(['publicKey' => $this->gerer->clePublique()]);
    }

    #[Route('/api/v1/admin/push', name: 'bsandoz_admin_push_subscribe', methods: ['POST'])]
    public function abonner(Request $request, #[CurrentUser] SecurityUser $user): Response
    {
        $body = Json::corps($request);
        $keys = is_array($body['keys'] ?? null) ? $body['keys'] : [];
        $endpoint = $body['endpoint'] ?? null;
        $p256dh = $keys['p256dh'] ?? null;
        $auth = $keys['auth'] ?? null;
        if (!is_string($endpoint) || !is_string($p256dh) || !is_string($auth)) {
            throw new InvalidRequest('Corps attendu : {"endpoint", "keys": {"p256dh", "auth"}}.');
        }
        $this->gerer->abonner($user->id(), $endpoint, $p256dh, $auth);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/v1/admin/push', name: 'bsandoz_admin_push_unsubscribe', methods: ['DELETE'])]
    public function desabonner(Request $request, #[CurrentUser] SecurityUser $user): Response
    {
        $endpoint = Json::corps($request)['endpoint'] ?? null;
        if (!is_string($endpoint)) {
            throw new InvalidRequest('« endpoint » est obligatoire.');
        }
        $this->gerer->desabonner($user->id(), $endpoint);

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
