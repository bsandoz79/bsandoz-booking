<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Bsandoz\Core\Booking\Application\ReserverCreneau;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Payment\Application\CreerSessionAcompte;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Infrastructure\Http\Limiteur;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Réservation publique, limitée par adresse IP, puis session de paiement de l'acompte (paymentUrl).
 * Si le paiement en ligne est indisponible, la réservation reste créée (bloquée le temps prévu) et
 * « paymentError » explique pourquoi ; annuler / déplacer : ManageController et MeController.
 */
#[Route('/api/v1/booking')]
final class BookingController
{
    public function __construct(
        private ReserverCreneau $reserver,
        private CreerSessionAcompte $sessionAcompte,
        private RateLimiterFactoryInterface $reservationLimiter,
    ) {
    }

    #[Route('/reservations', name: 'bsandoz_booking_reserve', methods: ['POST'])]
    public function reserve(Request $request): JsonResponse
    {
        Limiteur::consommer($this->reservationLimiter, $request);
        $resultat = ($this->reserver)(ReservationRequest::toCommand($request));

        $paymentUrl = null;
        $paymentError = null;
        if ($resultat->status === ReservationStatus::PendingPayment) {
            try {
                $paymentUrl = ($this->sessionAcompte)($resultat->reservationId);
            } catch (DomainError $e) {
                $paymentError = $e->getMessage();
            }
        }

        return new JsonResponse([
            'reservationId' => $resultat->reservationId,
            'status' => $resultat->status->value,
            'totalCents' => $resultat->total->cents,
            'depositCents' => $resultat->deposit->cents,
            'produitsCents' => $resultat->produits->cents ?? 0,
            'holdExpiresAt' => $resultat->holdExpiresAt?->format(DATE_ATOM),
            'manageToken' => $resultat->manageToken,
            'paymentUrl' => $paymentUrl,
            'paymentError' => $paymentError,
        ], Response::HTTP_CREATED);
    }
}
