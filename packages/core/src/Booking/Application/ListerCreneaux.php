<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Port\AvailabilityRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Booking\Domain\Service\CreneauCalculator;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\TimeRange;

/**
 * Créneaux libres d'un jour, pour une durée et une adresse (trajet calculé depuis la zone).
 * Si la prestation est donnée et qu'elle est à durée incertaine, seuls les débuts de demi-journée libres sont proposés.
 */
final class ListerCreneaux
{
    public function __construct(
        private AvailabilityRepository $availability,
        private SettingsProvider $settings,
        private PrestationRepository $prestations,
        private CreneauCalculator $calculator,
        private Occupations $occupations,
        private Trajet $trajet,
        private Clock $clock,
        private ?CreneauxGroupes $groupes = null,
    ) {
    }

    /**
     * Créneaux du jour, chacun marqué « groupé » s'il touche presque un rendez-vous déjà prévu (voir CreneauxGroupes).
     *
     * @return list<array{creneau: TimeRange, groupe: bool}>
     * @throws DomainError date invalide, adresse manquante ou hors zone
     */
    public function avecRegroupement(string $date, int $durationMin, ?float $lat, ?float $lng, ?string $prestationId = null): array
    {
        $creneaux = $this($date, $durationMin, $lat, $lng, $prestationId);
        $seuil = $this->groupes?->seuilMin() ?? 0;
        $rdv = [];
        if ($seuil > 0 && $creneaux !== []) {
            $day = \DateTimeImmutable::createFromFormat('!Y-m-d', $date, $this->settings->timezone());
            if ($day !== false) {
                $rdv = $this->occupations->reservations($day, $day->modify('+1 day'));
            }
        }
        $trajet = $rdv === [] ? 0 : ($this->trajet)($lat, $lng);
        $battement = $this->settings->rules()->bufferMin;

        return array_map(static function (TimeRange $c) use ($rdv, $seuil, $trajet, $battement): array {
            // Le créneau occupe aussi son trajet avant et son battement après.
            $debut = $c->start->modify(sprintf('-%d minutes', $trajet))->getTimestamp();
            $fin = $c->end->modify(sprintf('+%d minutes', $battement))->getTimestamp();
            foreach ($rdv as $r) {
                $ecart = max($r->start->getTimestamp() - $fin, $debut - $r->end->getTimestamp());
                if ($ecart <= $seuil * 60) {
                    return ['creneau' => $c, 'groupe' => true];
                }
            }

            return ['creneau' => $c, 'groupe' => false];
        }, $creneaux);
    }

    /**
     * @param string $date jour local au format Y-m-d
     * @param string|null $ignorerReservationId réservation à ne pas compter comme occupée (déplacement)
     * @return list<TimeRange> créneaux (début → fin), en UTC
     * @throws DomainError date invalide, adresse manquante ou hors zone
     */
    public function __invoke(string $date, int $durationMin, ?float $lat, ?float $lng, ?string $prestationId = null, ?string $ignorerReservationId = null): array
    {
        $tz = $this->settings->timezone();
        $day = \DateTimeImmutable::createFromFormat('!Y-m-d', $date, $tz);
        if ($day === false || $day->format('Y-m-d') !== $date) {
            throw new DomainError('Date invalide (format attendu AAAA-MM-JJ).');
        }

        $occupePlage = $prestationId !== null && $this->prestations->get($prestationId)->occupePlage();
        $travel = ($this->trajet)($lat, $lng);
        $busy = ($this->occupations)($day, $day->modify('+1 day'), $ignorerReservationId);

        $slots = $this->calculator->creneauxDuJour(
            $day, $durationMin, $travel, $this->availability->openingHours(), $busy,
            $this->settings->rules(), $this->clock->now(), $tz, $occupePlage,
        );

        $utc = new \DateTimeZone('UTC');

        return array_map(static fn (TimeRange $s): TimeRange => new TimeRange($s->start->setTimezone($utc), $s->end->setTimezone($utc)), $slots);
    }
}
