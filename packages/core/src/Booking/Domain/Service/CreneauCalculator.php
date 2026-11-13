<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Service;

use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\TimeRange;

/**
 * Calcule les créneaux libres.
 * Un créneau à l'heure H est libre si :
 *  - [H − trajet, H + durée] tient dans une plage d'ouverture du jour (le tampon peut dépasser la fermeture) ;
 *  - le bloc [H − trajet, H + durée + tampon] ne chevauche aucune période occupée (réservations bloquantes, congés) ;
 *  - H ≥ maintenant + délai minimum, et H ≤ maintenant + horizon.
 * Les créneaux partent de l'ouverture + trajet, puis avancent du pas réglé. Plusieurs plages le même jour
 * sont possibles ; un créneau commun à deux plages qui se chevauchent n'est compté qu'une fois.
 * Les heures d'ouverture sont en heure locale ($tz) ; tout le reste est comparé en instants absolus.
 * $day désigne une date locale : passer une date construite dans $tz.
 *
 * Prestation à durée incertaine ($occupePlage) : un seul créneau par plage d'ouverture (ex. matin, après-midi),
 * à l'ouverture + trajet, proposé seulement si toute la plage est libre ; il occupe la plage jusqu'à sa fermeture
 * (le créneau renvoyé se termine à la fermeture, pour bloquer le reste de la demi-journée une fois réservé).
 */
final class CreneauCalculator
{
    /**
     * @param list<OpeningHour> $openingHours
     * @param list<TimeRange> $busy
     * @return list<TimeRange> créneaux (début → fin de la prestation, ou fermeture de la plage si $occupePlage)
     */
    public function creneauxDuJour(
        \DateTimeImmutable $day,
        int $durationMin,
        int $travelMin,
        array $openingHours,
        array $busy,
        BookingRules $rules,
        \DateTimeImmutable $now,
        \DateTimeZone $tz,
        bool $occupePlage = false,
    ): array {
        if ($durationMin < 1) {
            throw new DomainError('La durée d\'une prestation doit être d\'au moins une minute.');
        }
        if ($travelMin < 0) {
            throw new DomainError('Le temps de trajet ne peut pas être négatif.');
        }

        $localDay = $day->setTimezone($tz)->setTime(0, 0);
        $weekday = (int) $localDay->format('N');
        $earliest = $now->modify(sprintf('+%d hours', $rules->minNoticeHours));
        $latest = $now->modify(sprintf('+%d days', $rules->horizonDays));
        $slots = [];

        foreach ($openingHours as $opening) {
            if ($opening->weekday !== $weekday) {
                continue;
            }
            $open = new TimeRange($this->at($localDay, $opening->startsAt), $this->at($localDay, $opening->endsAt));
            // Heures d'arrivée « rondes » : la grille du pas (8 h 00, 8 h 30…) part de l'ouverture ; le trajet vers le premier
            // rendez-vous se fait avant (seuls les autres rendez-vous et indisponibilités le limitent, pas l'ouverture).
            $start = $this->surLaGrille($open->start, $localDay, $rules->slotStepMin);

            if ($occupePlage) {
                $fits = $start->modify(sprintf('+%d minutes', $durationMin)) <= $open->end;
                $plage = new TimeRange($start->modify(sprintf('-%d minutes', $travelMin)), $open->end);
                if ($fits && $start >= $earliest && $start <= $latest && !$this->overlapsAny($plage, $busy)) {
                    $slots[$start->getTimestamp()] = new TimeRange($start, $open->end);
                }
                continue;
            }

            while (true) {
                $end = $start->modify(sprintf('+%d minutes', $durationMin));
                $block = new TimeRange(
                    $start->modify(sprintf('-%d minutes', $travelMin)),
                    $end->modify(sprintf('+%d minutes', $rules->bufferMin)),
                );
                if ($block->end > $open->end->modify(sprintf('+%d minutes', $rules->bufferMin))) {
                    break;
                }
                if ($start >= $earliest && $start <= $latest && !$this->overlapsAny($block, $busy)) {
                    $slots[$start->getTimestamp()] = new TimeRange($start, $end);
                }
                $start = $start->modify(sprintf('+%d minutes', $rules->slotStepMin));
            }
        }

        ksort($slots);

        return array_values($slots);
    }

    /**
     * Jours du mois (heure locale) qui ont au moins un créneau.
     *
     * @param list<OpeningHour> $openingHours
     * @param list<TimeRange> $busy
     * @return list<string> dates Y-m-d
     */
    public function joursDisponibles(
        int $year,
        int $month,
        int $durationMin,
        int $travelMin,
        array $openingHours,
        array $busy,
        BookingRules $rules,
        \DateTimeImmutable $now,
        \DateTimeZone $tz,
        bool $occupePlage = false,
    ): array {
        $first = new \DateTimeImmutable(sprintf('%04d-%02d-01 00:00', $year, $month), $tz);
        $days = [];
        for ($d = $first; (int) $d->format('n') === $month; $d = $d->modify('+1 day')) {
            if ($this->creneauxDuJour($d, $durationMin, $travelMin, $openingHours, $busy, $rules, $now, $tz, $occupePlage) !== []) {
                $days[] = $d->format('Y-m-d');
            }
        }

        return $days;
    }

    private function at(\DateTimeImmutable $localDay, string $hhmm): \DateTimeImmutable
    {
        [$h, $m] = array_map('intval', explode(':', $hhmm));

        return $localDay->setTime($h, $m);
    }

    /** @param list<TimeRange> $busy */
    private function overlapsAny(TimeRange $block, array $busy): bool
    {
        foreach ($busy as $period) {
            if ($block->overlaps($period)) {
                return true;
            }
        }

        return false;
    }

    /** Premier horaire de la grille (multiples du pas depuis minuit) à partir de $debut. */
    private function surLaGrille(\DateTimeImmutable $debut, \DateTimeImmutable $minuit, int $pasMin): \DateTimeImmutable
    {
        $pas = max(1, $pasMin) * 60;
        $ecart = $debut->getTimestamp() - $minuit->getTimestamp();
        $reste = $ecart % $pas;

        return $reste === 0 ? $debut : $debut->modify(sprintf('+%d seconds', $pas - $reste));
    }
}
