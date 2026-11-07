<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Port;

use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\Unavailability;
use Bsandoz\Core\Shared\Domain\TimeRange;

/** Horaires d'ouverture hebdomadaires et indisponibilités du pro. */
interface AvailabilityRepository
{
    /** @return list<OpeningHour> triées par jour puis heure de début */
    public function openingHours(): array;

    /** @return list<TimeRange> congés et blocages qui chevauchent [from, to[ */
    public function unavailabilities(\DateTimeImmutable $from, \DateTimeImmutable $to): array;

    public function saveOpeningHour(OpeningHour $openingHour): void;

    public function saveUnavailability(Unavailability $unavailability): void;
}
