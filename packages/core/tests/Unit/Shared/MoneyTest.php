<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Shared;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use PHPUnit\Framework\TestCase;

final class MoneyTest extends TestCase
{
    public function testAdditionEtPourcentage(): void
    {
        $total = Money::cents(12900)->add(Money::cents(1000));
        self::assertSame(13900, $total->cents);
        self::assertSame(4170, $total->percent(30)->cents);
    }

    public function testRefuseLesMontantsNegatifs(): void
    {
        $this->expectException(DomainError::class);
        Money::cents(-1);
    }
}
