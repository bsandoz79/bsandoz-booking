<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Bsandoz\Core\Booking\Application\AnnulerReservation;
use Bsandoz\Core\Booking\Application\DeplacerReservation;
use Bsandoz\Core\Booking\Application\ReservationParJeton;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Bsandoz\Core\Shared\Infrastructure\Http\Limiteur;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Lien « gérer mon rendez-vous », sans compte :
 *   GET    /api/v1/booking/manage/{token}                → la réservation
 *   PATCH  /api/v1/booking/manage/{token} {"start": …}   → déplacée (créneau de /booking/slots)
 *   DELETE /api/v1/booking/manage/{token}                → annulée, {"refundable": bool}
 */
#[Route('/api/v1/booking/manage/{token}')]
final class ManageController
{
    public function __construct(
        private ReservationParJeton $parJeton,
        private AnnulerReservation $annuler,
        private DeplacerReservation $deplacer,
        private SettingsProvider $settings,
        private RateLimiterFactoryInterface $manageLimiter,
        private \Bsandoz\Core\Payment\Application\ReprendrePaiement $reprendrePaiement,
    ) {
    }

    #[Route('', name: 'bsandoz_booking_manage_show', methods: ['GET'])]
    public function show(string $token, Request $request): JsonResponse
    {
        Limiteur::consommer($this->manageLimiter, $request);

        return new JsonResponse($this->vue(($this->parJeton)($token)));
    }

    /** Acompte non réglé : nouvelle page de paiement (409 si le créneau a été repris entre-temps). */
    #[Route('/payment', name: 'bsandoz_booking_manage_payment', methods: ['POST'])]
    public function payment(string $token, Request $request): JsonResponse
    {
        Limiteur::consommer($this->manageLimiter, $request);
        $reservation = ($this->parJeton)($token);

        return new JsonResponse(['paymentUrl' => ($this->reprendrePaiement)($reservation->id(), null)]);
    }

    #[Route('', name: 'bsandoz_booking_manage_move', methods: ['PATCH'])]
    public function move(string $token, Request $request): JsonResponse
    {
        Limiteur::consommer($this->manageLimiter, $request);
        $reservation = ($this->parJeton)($token);

        $body = json_decode($request->getContent(), true);
        $start = is_array($body) && is_string($body['start'] ?? null) ? \DateTimeImmutable::createFromFormat(DATE_ATOM, $body['start']) : false;
        if ($start === false) {
            throw new InvalidRequest('« start » doit être une date ISO 8601 avec fuseau, ex. 2026-11-10T08:00:00+00:00.');
        }

        ($this->deplacer)($reservation->id(), $start, $reservation->userId());

        return new JsonResponse($this->vue(($this->parJeton)($token)));
    }

    #[Route('', name: 'bsandoz_booking_manage_cancel', methods: ['DELETE'])]
    public function cancel(string $token, Request $request): JsonResponse
    {
        Limiteur::consommer($this->manageLimiter, $request);
        $reservation = ($this->parJeton)($token);

        return new JsonResponse(['refundable' => ($this->annuler)($reservation->id(), $reservation->userId())]);
    }

    /** @return array<string, mixed> */
    private function vue(Reservation $r): array
    {
        return VueReservation::enTableau($r, $this->settings->rules());
    }
}
