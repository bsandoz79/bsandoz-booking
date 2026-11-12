<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\Reservation;

/**
 * Réservation vue par son titulaire (lien de gestion ou espace client) : dates en UTC, coordonnées de l'adresse
 * (pour chercher un nouveau créneau en cas de déplacement) et limite d'annulation gratuite.
 */
final class VueReservation
{
    /** @return array<string, mixed> */
    public static function enTableau(Reservation $r, BookingRules $rules): array
    {
        $utc = new \DateTimeZone('UTC');
        $start = $r->period()->start;

        return [
            'id' => $r->id(),
            'status' => $r->status()->value,
            'prestationId' => $r->prestationId(),
            'optionIds' => $r->optionIds(),
            'start' => $start->setTimezone($utc)->format(DATE_ATOM),
            'end' => $r->period()->end->setTimezone($utc)->format(DATE_ATOM),
            'address' => $r->address(),
            'lat' => $r->lat(),
            'lng' => $r->lng(),
            'totalCents' => $r->total()->cents,
            'depositCents' => $r->deposit()->cents,
            'freeCancelUntil' => $start->modify(sprintf('-%d hours', $rules->freeCancelHours))->setTimezone($utc)->format(DATE_ATOM),
        ];
    }
}
