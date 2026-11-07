<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Shared;

use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Shared\Infrastructure\SystemClock;
use PHPUnit\Framework\TestCase;

final class ClockTest extends TestCase
{
    public function testHorlogeSystemeRenvoieLHeureCouranteEnUtc(): void
    {
        $avant = time();
        $now = (new SystemClock())->now();
        $apres = time();

        self::assertSame('UTC', $now->getTimezone()->getName());
        self::assertGreaterThanOrEqual($avant, $now->getTimestamp());
        self::assertLessThanOrEqual($apres, $now->getTimestamp());
    }

    public function testHorlogeFigeeRenvoieToujoursLaMemeDate(): void
    {
        $clock = new FrozenClock('2026-11-07 10:00:00');

        self::assertSame('2026-11-07T10:00:00+00:00', $clock->now()->format(DATE_ATOM));
        self::assertEquals($clock->now(), $clock->now());
    }

    public function testHorlogeFigeeConvertitEnUtc(): void
    {
        $paris = new \DateTimeImmutable('2026-07-01 10:00:00', new \DateTimeZone('Europe/Paris'));
        $clock = new FrozenClock($paris);

        self::assertSame('UTC', $clock->now()->getTimezone()->getName());
        self::assertSame('2026-07-01T08:00:00+00:00', $clock->now()->format(DATE_ATOM));
    }

    public function testHorlogeFigeePeutEtreDeplacee(): void
    {
        $clock = new FrozenClock('2026-11-07 10:00:00');

        $clock->modify('+10 minutes');
        self::assertSame('2026-11-07T10:10:00+00:00', $clock->now()->format(DATE_ATOM));

        $clock->set('2026-12-24 18:30:00');
        self::assertSame('2026-12-24T18:30:00+00:00', $clock->now()->format(DATE_ATOM));
    }
}
