<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Booking\Domain\Model\Unavailability;
use Bsandoz\Core\Booking\Domain\Port\AvailabilityRepository;
use Bsandoz\Core\Shared\Domain\NotFound;

final class InMemoryAvailabilityRepository implements AvailabilityRepository
{
    /** @var list<OpeningHour> */
    private array $hours = [];

    /** @var array<string, Unavailability> */
    private array $unavailabilities = [];

    public function openingHours(): array
    {
        $hours = $this->hours;
        usort($hours, static fn (OpeningHour $a, OpeningHour $b): int => [$a->weekday, $a->startsAt] <=> [$b->weekday, $b->startsAt]);

        return $hours;
    }

    public function unavailabilities(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        return array_map(static fn (Unavailability $u) => $u->period, $this->unavailabilityList($from, $to));
    }

    public function unavailabilityList(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $found = array_values(array_filter($this->unavailabilities, static fn (Unavailability $u): bool => $u->period->start < $to && $u->period->end > $from));
        usort($found, static fn (Unavailability $a, Unavailability $b): int => $a->period->start <=> $b->period->start);

        return $found;
    }

    public function saveOpeningHour(OpeningHour $openingHour): void
    {
        $this->hours[] = $openingHour;
    }

    public function replaceOpeningHours(array $openingHours): void
    {
        $this->hours = $openingHours;
    }

    public function saveUnavailability(Unavailability $unavailability): void
    {
        $this->unavailabilities[$unavailability->id] = $unavailability;
    }

    public function removeUnavailability(string $id): void
    {
        if (!isset($this->unavailabilities[$id])) {
            throw new NotFound('Indisponibilité introuvable.');
        }
        unset($this->unavailabilities[$id]);
    }
}
