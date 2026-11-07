<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Annulation par le client titulaire, selon les règles d'annulation.
 * Renvoie vrai si l'acompte est remboursable : le remboursement (feature/core-payment)
 * et les mails au client et au pro (feature/core-notification) s'appuieront sur ce résultat.
 */
final class AnnulerReservation
{
    public function __construct(
        private ReservationRepository $reservations,
        private SettingsProvider $settings,
        private Clock $clock,
    ) {
    }

    /**
     * @throws NotFound réservation inconnue ou d'un autre client
     * @throws DomainError réservation déjà annulée ou passée
     */
    public function __invoke(string $reservationId, string $actorUserId): bool
    {
        $reservation = $this->reservations->get($reservationId);
        if ($reservation->userId() !== $actorUserId) {
            throw new NotFound('Réservation introuvable.');
        }

        $refundable = $reservation->cancel($this->clock->now(), $this->settings->rules());
        $this->reservations->save($reservation);

        return $refundable;
    }
}
