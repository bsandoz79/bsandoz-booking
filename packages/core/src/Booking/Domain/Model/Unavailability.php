<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

use Bsandoz\Core\Shared\Domain\TimeRange;

/** Indisponibilité du pro (congés, rendez-vous personnel…) : aucun créneau proposé pendant cette période. Pas « final » : Doctrine génère un proxy (lazy ghost) pour chaque entité. */
class Unavailability
{
    public readonly string $id;

    public function __construct(
        public readonly TimeRange $period,
        public readonly string $reason = '',
        ?string $id = null,
    ) {
        $this->id = $id ?? bin2hex(random_bytes(16));
    }
}
