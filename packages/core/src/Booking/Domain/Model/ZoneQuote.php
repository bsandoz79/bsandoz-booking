<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

use Bsandoz\Core\Shared\Domain\Money;

final class ZoneQuote
{
    public function __construct(
        public readonly float $distanceKm,
        public readonly bool $inZone,
        public readonly Money $travelFee,
        public readonly int $travelMinutes,
    ) {
    }
}
