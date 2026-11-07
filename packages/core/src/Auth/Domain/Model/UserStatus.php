<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Domain\Model;

enum UserStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Deleted = 'deleted';
}
