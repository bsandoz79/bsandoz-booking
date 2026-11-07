<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Domain;

/** Notification de paiement dont la signature est absente, fausse ou trop ancienne : elle est ignorée (400). */
final class SignatureInvalide extends \RuntimeException
{
}
