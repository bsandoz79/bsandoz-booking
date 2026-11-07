<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Bsandoz\Core\Booking\Application\ReserverCreneau;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Réservation publique. À venir : lien de paiement de l'acompte (feature/core-payment), limitation de débit
 * et gestion par jeton / espace client pour annuler ou déplacer (feature/core-auth).
 */
#[Route('/api/v1/booking')]
final class BookingController
{
    public function __construct(private ReserverCreneau $reserver)
    {
    }

    #[Route('/reservations', name: 'bsandoz_booking_reserve', methods: ['POST'])]
    public function reserve(Request $request): JsonResponse
    {
        $resultat = ($this->reserver)(ReservationRequest::toCommand($request));

        return new JsonResponse([
            'reservationId' => $resultat->reservationId,
            'status' => $resultat->status->value,
            'totalCents' => $resultat->total->cents,
            'depositCents' => $resultat->deposit->cents,
            'holdExpiresAt' => $resultat->holdExpiresAt?->format(DATE_ATOM),
            'paymentUrl' => null,
        ], Response::HTTP_CREATED);
    }
}
