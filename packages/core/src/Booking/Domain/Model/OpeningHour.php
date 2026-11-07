<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

/** Plage d'ouverture hebdomadaire, en heure locale (ex. lundi 08:00–12:00). */
final class OpeningHour
{
    /** @param int $weekday 1 = lundi … 7 = dimanche (ISO-8601) */
    public function __construct(
        public readonly int $weekday,
        public readonly string $startsAt,
        public readonly string $endsAt,
    ) {
    }
}
