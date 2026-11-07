<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Port\AvailabilityRepository;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\TimeRange;

/**
 * Périodes où le pro n'est pas disponible : indisponibilités, et réservations qui bloquent le créneau
 * (confirmées, terminées, ou en attente de paiement dont le blocage court encore).
 * Chaque réservation est étendue de son propre temps de trajet aller : le pro doit partir avant l'heure du rendez-vous.
 */
final class Occupations
{
    /** Marge de lecture autour de la période, pour attraper les trajets qui débordent. */
    private const MARGE_HEURES = 12;

    public function __construct(
        private ReservationRepository $reservations,
        private AvailabilityRepository $availability,
        private Trajet $trajet,
        private Clock $clock,
    ) {
    }

    /** @return list<TimeRange> */
    public function __invoke(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $now = $this->clock->now();
        $busy = $this->availability->unavailabilities($from, $to);

        $marge = sprintf('%d hours', self::MARGE_HEURES);
        foreach ($this->reservations->between($from->modify('-' . $marge), $to->modify('+' . $marge)) as $reservation) {
            if (!$reservation->blocks($now)) {
                continue;
            }
            $travel = $this->trajet->versReservation($reservation->lat(), $reservation->lng());
            $period = $reservation->period();
            $busy[] = new TimeRange($period->start->modify(sprintf('-%d minutes', $travel)), $period->end);
        }

        return $busy;
    }
}
