<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Fidelite\Application\GererFidelite;
use Bsandoz\Core\Shared\Domain\Clock;

/**
 * Passe en « expired » les réservations en attente de paiement dont le blocage est dépassé (lancé par le cron).
 * Le créneau est déjà libre pour les autres clients dès la fin du blocage : ceci range seulement les statuts.
 */
final class ExpirerReservationsNonPayees
{
    public function __construct(
        private ReservationRepository $reservations,
        private Clock $clock,
        private ?GererFidelite $fidelite = null,
    ) {
    }

    /** @return int nombre de réservations expirées */
    public function __invoke(): int
    {
        $expired = $this->reservations->pendingHoldExpired($this->clock->now());
        foreach ($expired as $reservation) {
            $reservation->expire();
            $this->reservations->save($reservation);
            // Remise de fidélité non payée : la carte redevient pleine (reprise si le paiement arrive quand même).
            if ($reservation->remiseFidelite()->cents > 0) {
                $this->fidelite?->rendreRemise($reservation->userId());
            }
        }

        return count($expired);
    }
}
