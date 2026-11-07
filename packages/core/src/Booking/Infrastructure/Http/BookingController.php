<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** @todo Valider les entrées (DTO + contraintes), appeler les cas d'usage, rate limiter sur reserve(). */
#[Route('/api/v1/booking')]
final class BookingController
{
    #[Route('/days', methods: ['GET'])]
    public function days(Request $request): JsonResponse { throw new \LogicException('À implémenter'); }

    #[Route('/slots', methods: ['GET'])]
    public function slots(Request $request): JsonResponse { throw new \LogicException('À implémenter'); }

    #[Route('/reservations', methods: ['POST'])]
    public function reserve(Request $request): JsonResponse { throw new \LogicException('À implémenter'); }

    #[Route('/manage/{token}', methods: ['GET', 'PATCH', 'DELETE'])]
    public function manage(string $token, Request $request): JsonResponse { throw new \LogicException('À implémenter'); }
}
