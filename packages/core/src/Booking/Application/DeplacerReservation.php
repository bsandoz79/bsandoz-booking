<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Catalog\Application\CalculerDevis;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Déplacement par le client titulaire vers un autre créneau libre, sous verrou d'agenda.
 * La durée est recalculée à partir de la prestation et des options réservées ; le créneau actuel
 * de la réservation n'est pas compté comme occupé. Mails : feature/core-notification.
 */
final class DeplacerReservation
{
    public function __construct(
        private ReservationRepository $reservations,
        private ListerCreneaux $creneaux,
        private CalculerDevis $calculerDevis,
        private SettingsProvider $settings,
        private Clock $clock,
    ) {
    }

    /**
     * @throws NotFound réservation inconnue ou d'un autre client
     * @throws DomainError réservation non confirmée, délai dépassé, créneau indisponible
     */
    public function __invoke(string $reservationId, \DateTimeImmutable $newStart, string $actorUserId): void
    {
        $reservation = $this->reservations->get($reservationId);
        if ($reservation->userId() !== $actorUserId) {
            throw new NotFound('Réservation introuvable.');
        }

        $aDomicile = $this->settings->zone() !== null;
        $lat = $aDomicile ? $reservation->lat() : null;
        $lng = $aDomicile ? $reservation->lng() : null;
        $duration = ($this->calculerDevis)(
            $reservation->prestationId(), $reservation->optionIds(), $reservation->metierData(), $lat, $lng, $reservation->variante(),
        )->durationMin;

        $this->reservations->dansVerrouAgenda(function () use ($reservation, $newStart, $lat, $lng, $duration): void {
            $date = $newStart->setTimezone($this->settings->timezone())->format('Y-m-d');
            foreach (($this->creneaux)($date, $duration, $lat, $lng, $reservation->prestationId(), $reservation->id()) as $slot) {
                if ($slot->start->getTimestamp() === $newStart->getTimestamp()) {
                    $reservation->reschedule($slot, $this->clock->now(), $this->settings->rules());
                    $this->reservations->save($reservation);

                    return;
                }
            }

            throw new DomainError('Ce créneau n\'est pas disponible, merci d\'en choisir un autre.');
        });
    }
}
