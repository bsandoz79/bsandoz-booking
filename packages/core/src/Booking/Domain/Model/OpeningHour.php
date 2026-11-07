<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;

/** Plage d'ouverture hebdomadaire, en heure locale (ex. lundi 08:00–12:00 ; « 24:00 » = minuit en fin de journée). */
final class OpeningHour
{
    /** @param int $weekday 1 = lundi … 7 = dimanche (ISO-8601) */
    public function __construct(
        public readonly int $weekday,
        public readonly string $startsAt,
        public readonly string $endsAt,
    ) {
        if ($weekday < 1 || $weekday > 7) {
            throw new DomainError('Le jour doit être compris entre 1 (lundi) et 7 (dimanche).');
        }
        if (self::minutes($startsAt) >= self::minutes($endsAt)) {
            throw new DomainError('La fin d\'une plage d\'ouverture doit être après son début.');
        }
    }

    /** Minutes depuis minuit, pour une heure « HH:MM » de 00:00 à 24:00. */
    private static function minutes(string $hhmm): int
    {
        if ($hhmm === '24:00') {
            return 1440;
        }
        if (preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $hhmm, $m) !== 1) {
            throw new DomainError(sprintf('Heure invalide « %s » (format attendu HH:MM).', $hhmm));
        }

        return (int) $m[1] * 60 + (int) $m[2];
    }
}
