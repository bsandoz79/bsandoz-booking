<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Domain\Model;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case PartiallyRefunded = 'partially_refunded';
    case Refunded = 'refunded';
}
