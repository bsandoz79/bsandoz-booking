<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\Unavailability;
use Bsandoz\Core\Booking\Domain\Port\AvailabilityRepository;

final class InMemoryAvailabilityRepository implements AvailabilityRepository
{
    /** @var list<OpeningHour> */
    private array $hours = [];

    /** @var list<Unavailability> */
    private array $unavailabilities = [];

    public function openingHours(): array
    {
        $hours = $this->hours;
        usort($hours, static fn (OpeningHour $a, OpeningHour $b): int => [$a->weekday, $a->startsAt] <=> [$b->weekday, $b->startsAt]);

        return $hours;
    }

    public function unavailabilities(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $periods = [];
        foreach ($this->unavailabilities as $u) {
            if ($u->period->start < $to && $u->period->end > $from) {
                $periods[] = $u->period;
            }
        }

        return $periods;
    }

    public function saveOpeningHour(OpeningHour $openingHour): void
    {
        $this->hours[] = $openingHour;
    }

    public function saveUnavailability(Unavailability $unavailability): void
    {
        $this->unavailabilities[] = $unavailability;
    }
}
