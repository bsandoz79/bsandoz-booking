<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure\Http;

/** Corps ou paramètres de requête invalides (traduit en 400 par l'API). */
final class InvalidRequest extends \InvalidArgumentException
{
}
