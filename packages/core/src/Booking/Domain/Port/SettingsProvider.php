<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Port;

use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\Zone;

interface SettingsProvider
{
    public function rules(): BookingRules;

    /** Zone d'intervention, ou null pour une activité sur place (ni trajet ni frais de déplacement). */
    public function zone(): ?Zone;

    public function timezone(): \DateTimeZone;
}
