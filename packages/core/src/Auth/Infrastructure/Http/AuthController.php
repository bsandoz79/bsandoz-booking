<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Infrastructure\Http;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** @todo login/refresh/logout via LexikJWT + refresh token en cookie httpOnly ; rate limiter. */
#[Route('/api/v1/auth')]
final class AuthController
{
    #[Route('/activate', methods: ['POST'])]
    public function activate(Request $request): JsonResponse { throw new \LogicException('À implémenter'); }

    #[Route('/forgot', methods: ['POST'])]
    public function forgot(Request $request): JsonResponse { throw new \LogicException('À implémenter'); }

    #[Route('/reset', methods: ['POST'])]
    public function reset(Request $request): JsonResponse { throw new \LogicException('À implémenter'); }
}
