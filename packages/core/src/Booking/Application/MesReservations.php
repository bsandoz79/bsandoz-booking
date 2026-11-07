<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;

/** Réservations du client connecté, de la plus récente à la plus ancienne (espace client). */
final class MesReservations
{
    public function __construct(private ReservationRepository $reservations)
    {
    }

    /** @return list<Reservation> */
    public function __invoke(string $userId): array
    {
        return $this->reservations->forUser($userId);
    }
}
