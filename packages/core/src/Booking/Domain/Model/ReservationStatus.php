<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

enum ReservationStatus: string
{
    case PendingPayment = 'pending_payment';
    case Confirmed = 'confirmed';
    case Done = 'done';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
    case NoShow = 'no_show';

    /** Statuts qui bloquent le créneau dans l'agenda. */
    public function blocksSlot(): bool
    {
        return in_array($this, [self::PendingPayment, self::Confirmed, self::Done], true);
    }
}
