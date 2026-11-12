<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\Unavailability;
use Bsandoz\Core\Booking\Domain\Port\AvailabilityRepository;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Shared\Domain\TimeRange;

/**
 * Horaires et indisponibilités dans l'espace pro.
 * Horaires : [{"weekday": 1-7, "startsAt": "08:00", "endsAt": "12:00"}, …] (plusieurs plages par jour possibles, heures locales).
 * Indisponibilité : début et fin (dates avec fuseau), motif facultatif.
 */
final class GererDisponibilites
{
    public function __construct(
        private AvailabilityRepository $availability,
        private IdGenerator $ids,
    ) {
    }

    /** @return list<array{id: string, weekday: int, startsAt: string, endsAt: string}> */
    public function horaires(): array
    {
        return array_map(static fn (OpeningHour $h): array => ['id' => $h->id, 'weekday' => $h->weekday, 'startsAt' => $h->startsAt, 'endsAt' => $h->endsAt], $this->availability->openingHours());
    }

    /**
     * @param list<array<string, mixed>> $plages
     * @return list<array{id: string, weekday: int, startsAt: string, endsAt: string}>
     * @throws DomainError plage invalide ou deux plages qui se chevauchent le même jour
     */
    public function definirHoraires(array $plages): array
    {
        $horaires = [];
        foreach ($plages as $plage) {
            $weekday = $plage['weekday'] ?? null;
            $startsAt = $plage['startsAt'] ?? null;
            $endsAt = $plage['endsAt'] ?? null;
            if (!is_int($weekday) || !is_string($startsAt) || !is_string($endsAt)) {
                throw new DomainError('Chaque plage doit avoir « weekday » (1 à 7), « startsAt » et « endsAt » (HH:MM).');
            }
            $nouvelle = new OpeningHour($weekday, $startsAt, $endsAt, $this->ids->generate());
            foreach ($horaires as $autre) {
                if ($autre->weekday === $weekday && $startsAt < $autre->endsAt && $autre->startsAt < $endsAt) {
                    throw new DomainError('Deux plages d\'ouverture se chevauchent le même jour.');
                }
            }
            $horaires[] = $nouvelle;
        }
        $this->availability->replaceOpeningHours($horaires);

        return $this->horaires();
    }

    /** @return list<array{id: string, start: string, end: string, reason: string}> */
    public function indisponibilites(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $utc = new \DateTimeZone('UTC');

        return array_map(static fn (Unavailability $u): array => [
            'id' => $u->id,
            'start' => $u->period->start->setTimezone($utc)->format(DATE_ATOM),
            'end' => $u->period->end->setTimezone($utc)->format(DATE_ATOM),
            'reason' => $u->reason,
        ], $this->availability->unavailabilityList($from, $to));
    }

    /** @throws DomainError fin avant le début */
    public function ajouterIndisponibilite(\DateTimeImmutable $start, \DateTimeImmutable $end, string $reason = ''): string
    {
        $unavailability = new Unavailability(new TimeRange($start, $end), mb_substr(trim($reason), 0, 255), $this->ids->generate());
        $this->availability->saveUnavailability($unavailability);

        return $unavailability->id;
    }

    /** @throws NotFound */
    public function supprimerIndisponibilite(string $id): void
    {
        $this->availability->removeUnavailability($id);
    }
}
