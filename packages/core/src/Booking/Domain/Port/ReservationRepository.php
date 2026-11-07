<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Port;

use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Shared\Domain\NotFound;

interface ReservationRepository
{
    /** @throws NotFound */
    public function get(string $id): Reservation;

    /** @return list<Reservation> réservations qui chevauchent [from, to[ (tous statuts), triées par début */
    public function between(\DateTimeImmutable $from, \DateTimeImmutable $to): array;

    /** @return list<Reservation> de la plus récente à la plus ancienne */
    public function forUser(string $userId): array;

    /** @return list<Reservation> réservations en attente de paiement dont le blocage a expiré à $now */
    public function pendingHoldExpired(\DateTimeImmutable $now): array;

    public function save(Reservation $reservation): void;

    /**
     * Exécute $operation seul sur l'agenda (verrou + transaction), pour qu'un même créneau
     * ne puisse pas être réservé deux fois en même temps.
     *
     * @template T
     * @param callable(): T $operation
     * @return T
     */
    public function dansVerrouAgenda(callable $operation): mixed;
}
