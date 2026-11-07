<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Domain;

/** Horloge injectable, pour pouvoir tester le temps. */
interface Clock
{
    public function now(): \DateTimeImmutable;
}
