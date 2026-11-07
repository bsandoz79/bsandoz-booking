<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

/** Règles de réservation réglées par le pro. */
final class BookingRules
{
    public function __construct(
        public readonly int $minNoticeHours = 24,
        public readonly int $horizonDays = 60,
        public readonly int $bufferMin = 15,
        public readonly int $slotStepMin = 30,
        public readonly int $freeCancelHours = 48,
        public readonly ?int $depositPercent = 30,
        public readonly ?int $depositFixedCents = null,
        public readonly int $holdMinutes = 10,
    ) {
    }
}
