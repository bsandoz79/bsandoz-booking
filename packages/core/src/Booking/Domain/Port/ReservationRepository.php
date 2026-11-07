<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Port;

use Bsandoz\Core\Booking\Domain\Model\Reservation;

interface ReservationRepository
{
    public function get(string $id): Reservation;

    /** @return list<Reservation> réservations qui chevauchent [from, to[ (tous statuts) */
    public function between(\DateTimeImmutable $from, \DateTimeImmutable $to): array;

    /** @return list<Reservation> */
    public function forUser(string $userId): array;

    public function save(Reservation $reservation): void;

    /** Verrou pour éviter deux réservations simultanées sur le même créneau (SELECT … FOR UPDATE / verrou applicatif). */
    public function lockAgenda(): void;
}
