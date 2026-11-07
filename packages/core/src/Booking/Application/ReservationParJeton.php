<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Shared\Domain\NotFound;

/** Retrouve la réservation du lien « gérer mon rendez-vous » (jeton réutilisable jusqu'à la fin du rendez-vous). */
final class ReservationParJeton
{
    public function __construct(
        private TokenService $tokens,
        private ReservationRepository $reservations,
    ) {
    }

    /** @throws NotFound lien invalide ou expiré */
    public function __invoke(string $token): Reservation
    {
        $reservationId = $this->tokens->verify($token, TokenType::ManageReservation)
            ?? throw new NotFound('Ce lien de gestion est invalide ou a expiré.');

        return $this->reservations->get($reservationId);
    }
}
