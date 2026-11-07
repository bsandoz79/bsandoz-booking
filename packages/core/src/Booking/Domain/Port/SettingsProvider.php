<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Port;

use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\Zone;

interface SettingsProvider
{
    public function rules(): BookingRules;

    public function zone(): Zone;

    public function timezone(): \DateTimeZone;
}
