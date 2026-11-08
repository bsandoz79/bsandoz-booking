<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Booking\Application\NotificationsReservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Notification\Domain\Model\NotificationEnvoyee;
use Bsandoz\Core\Notification\Domain\Port\JournalNotifications;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\IdGenerator;

/**
 * Rappel de la veille (cron) : chaque rendez-vous confirmé du lendemain (heure locale du pro) reçoit un seul rappel,
 * avec un lien « gérer mon rendez-vous ». Peut être lancé aussi souvent que voulu.
 */
final class EnvoyerRappels
{
    public function __construct(
        private ReservationRepository $reservations,
        private JournalNotifications $journal,
        private NotificationsReservation $notifications,
        private TokenService $tokens,
        private SettingsProvider $settings,
        private IdGenerator $ids,
        private Clock $clock,
    ) {
    }

    /** @return int nombre de rappels envoyés */
    public function __invoke(): int
    {
        $now = $this->clock->now();
        $demain = $now->setTimezone($this->settings->timezone())->modify('+1 day')->setTime(0, 0);
        $apresDemain = $demain->modify('+1 day');

        $envoyes = 0;
        foreach ($this->reservations->between($demain, $apresDemain) as $reservation) {
            $debut = $reservation->period()->start;
            if ($reservation->status() !== ReservationStatus::Confirmed || $debut < $demain || $debut >= $apresDemain) {
                continue;
            }
            if ($this->journal->dejaEnvoyee(NotificationEnvoyee::RAPPEL, $reservation->id())) {
                continue;
            }

            $validite = max(3600, $reservation->period()->end->getTimestamp() - $now->getTimestamp());
            $lien = $this->tokens->issue($reservation->id(), TokenType::ManageReservation, new \DateInterval(sprintf('PT%dS', $validite)), replacePrevious: false);
            $this->notifications->rappel($reservation, $lien);
            $this->journal->enregistrer(new NotificationEnvoyee($this->ids->generate(), NotificationEnvoyee::RAPPEL, $reservation->id(), $now));
            ++$envoyes;
        }

        return $envoyes;
    }
}
