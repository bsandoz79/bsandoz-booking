<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Bsandoz\Core\Booking\Application\ReserverCreneau;
use Bsandoz\Core\Shared\Infrastructure\Http\Limiteur;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Réservation publique, limitée par adresse IP. Le lien de paiement de l'acompte arrive avec feature/core-payment ;
 * annuler / déplacer : ManageController (lien « gérer mon rendez-vous ») et l'espace client (feature/core-auth-session).
 */
#[Route('/api/v1/booking')]
final class BookingController
{
    public function __construct(
        private ReserverCreneau $reserver,
        private RateLimiterFactoryInterface $reservationLimiter,
    ) {
    }

    #[Route('/reservations', name: 'bsandoz_booking_reserve', methods: ['POST'])]
    public function reserve(Request $request): JsonResponse
    {
        Limiteur::consommer($this->reservationLimiter, $request);
        $resultat = ($this->reserver)(ReservationRequest::toCommand($request));

        return new JsonResponse([
            'reservationId' => $resultat->reservationId,
            'status' => $resultat->status->value,
            'totalCents' => $resultat->total->cents,
            'depositCents' => $resultat->deposit->cents,
            'holdExpiresAt' => $resultat->holdExpiresAt?->format(DATE_ATOM),
            'manageToken' => $resultat->manageToken,
            'paymentUrl' => null,
        ], Response::HTTP_CREATED);
    }
}
