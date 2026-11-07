<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure;

use Bsandoz\Core\Shared\Domain\IdGenerator;
use Symfony\Component\Uid\Uuid;

/** UUID v7 (ordonnés dans le temps, 36 caractères). */
final class UuidGenerator implements IdGenerator
{
    public function generate(): string
    {
        return Uuid::v7()->toRfc4122();
    }
}
