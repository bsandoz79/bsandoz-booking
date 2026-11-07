<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Shared\Domain\NotFound;

final class InMemoryReservationRepository implements ReservationRepository
{
    /** @var array<string, Reservation> */
    private array $items = [];

    public int $locks = 0;

    public function __construct(Reservation ...$reservations)
    {
        foreach ($reservations as $reservation) {
            $this->save($reservation);
        }
    }

    public function get(string $id): Reservation
    {
        return $this->items[$id] ?? throw new NotFound('Réservation introuvable.');
    }

    public function between(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $found = array_values(array_filter($this->items, static fn (Reservation $r): bool => $r->period()->start < $to && $r->period()->end > $from));
        usort($found, static fn (Reservation $a, Reservation $b): int => $a->period()->start <=> $b->period()->start);

        return $found;
    }

    public function forUser(string $userId): array
    {
        $found = array_values(array_filter($this->items, static fn (Reservation $r): bool => $r->userId() === $userId));
        usort($found, static fn (Reservation $a, Reservation $b): int => $b->period()->start <=> $a->period()->start);

        return $found;
    }

    public function save(Reservation $reservation): void
    {
        $this->items[$reservation->id()] = $reservation;
    }

    public function lockAgenda(): void
    {
        ++$this->locks;
    }
}
