<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Application;

use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Shared\Domain\Clock;

/**
 * Tableau de bord du pro (heure locale) : rendez-vous du jour et de la semaine, chiffre d'affaires du mois
 * (rendez-vous confirmés ou faits), réservations en attente de paiement, taux d'annulation du mois, prochains rendez-vous.
 */
final class TableauDeBord
{
    private const PROCHAINS = 5;

    public function __construct(
        private ReservationRepository $reservations,
        private SettingsProvider $settings,
        private Clock $clock,
    ) {
    }

    /** @return array<string, mixed> */
    public function __invoke(): array
    {
        $now = $this->clock->now();
        $local = $now->setTimezone($this->settings->timezone());
        $jour = $local->setTime(0, 0);
        $semaine = $jour->modify('monday this week');
        $mois = $jour->modify('first day of this month');

        $duJour = $this->reservations->between($jour, $jour->modify('+1 day'));
        $deLaSemaine = $this->reservations->between($semaine, $semaine->modify('+7 days'));
        $duMois = $this->reservations->between($mois, $mois->modify('+1 month'));

        $confirmes = static fn (array $liste): array => array_values(array_filter($liste, static fn (Reservation $r): bool => in_array($r->status(), [ReservationStatus::Confirmed, ReservationStatus::Done], true)));
        $moisConfirmes = $confirmes($duMois);
        $annules = count(array_filter($duMois, static fn (Reservation $r): bool => $r->status() === ReservationStatus::Cancelled));
        $base = count($moisConfirmes) + $annules + count(array_filter($duMois, static fn (Reservation $r): bool => $r->status() === ReservationStatus::NoShow));

        $futur = $this->reservations->between($now, $now->modify('+366 days'));
        $aVenir = array_values(array_filter($futur, static fn (Reservation $r): bool => $r->status() === ReservationStatus::Confirmed && $r->period()->start >= $now));
        $utc = new \DateTimeZone('UTC');

        return [
            'today' => count($confirmes($duJour)),
            'week' => count($confirmes($deLaSemaine)),
            'monthRevenueCents' => array_sum(array_map(static fn (Reservation $r): int => $r->total()->cents, $moisConfirmes)),
            'monthBookings' => count($moisConfirmes),
            'pendingPayments' => count(array_filter($futur, static fn (Reservation $r): bool => $r->status() === ReservationStatus::PendingPayment && $r->blocks($now))),
            'monthCancellationRate' => $base === 0 ? 0.0 : round($annules / $base, 3),
            'next' => array_map(static fn (Reservation $r): array => [
                'id' => $r->id(),
                'start' => $r->period()->start->setTimezone($utc)->format(DATE_ATOM),
                'address' => $r->address(),
            ], array_slice($aVenir, 0, self::PROCHAINS)),
        ];
    }
}
