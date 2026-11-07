<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Domain\Model;

enum TokenType: string
{
    case Activation = 'activation';
    case PasswordReset = 'reset';
    case ManageReservation = 'manage';
    case EmailChange = 'email_change';
}
