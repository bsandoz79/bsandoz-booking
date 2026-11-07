<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Shared\Domain\IdGenerator;

/** Identifiants prévisibles : <préfixe>-1, <préfixe>-2… */
final class SequenceIdGenerator implements IdGenerator
{
    private int $next = 1;

    public function __construct(private string $prefix = 'id')
    {
    }

    public function generate(): string
    {
        return sprintf('%s-%d', $this->prefix, $this->next++);
    }
}
