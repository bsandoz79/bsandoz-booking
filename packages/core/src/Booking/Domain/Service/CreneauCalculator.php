<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Service;

use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Shared\Domain\TimeRange;

/**
 * Calcule les créneaux libres.
 * Un créneau à l'heure H est libre si :
 *  - [H − trajet, H + durée + tampon] tient dans une plage d'ouverture du jour ;
 *  - ce bloc ne chevauche aucune période occupée (réservations bloquantes, congés) ;
 *  - H ≥ maintenant + délai minimum, et H ≤ maintenant + horizon.
 * Les heures d'ouverture sont en heure locale ($tz) ; tout le reste est comparé en instants absolus.
 */
final class CreneauCalculator
{
    /**
     * @param list<OpeningHour> $openingHours
     * @param list<TimeRange> $busy
     * @return list<TimeRange> créneaux (début → fin de la prestation)
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
    ): array {
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
            $start = $open->start->modify(sprintf('+%d minutes', $travelMin));

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
                    $slots[] = new TimeRange($start, $end);
                }
                $start = $start->modify(sprintf('+%d minutes', $rules->slotStepMin));
            }
        }

        usort($slots, static fn (TimeRange $a, TimeRange $b) => $a->start <=> $b->start);

        return $slots;
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
    ): array {
        $first = new \DateTimeImmutable(sprintf('%04d-%02d-01 00:00', $year, $month), $tz);
        $days = [];
        for ($d = $first; (int) $d->format('n') === $month; $d = $d->modify('+1 day')) {
            if ($this->creneauxDuJour($d, $durationMin, $travelMin, $openingHours, $busy, $rules, $now, $tz) !== []) {
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
}
