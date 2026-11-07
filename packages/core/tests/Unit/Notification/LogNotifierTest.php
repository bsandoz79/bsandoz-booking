<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Notification;

use Bsandoz\Core\Notification\Infrastructure\LogNotifier;
use PHPUnit\Framework\TestCase;
use Psr\Log\AbstractLogger;

final class LogNotifierTest extends TestCase
{
    public function testEcritLeMailDansLeJournal(): void
    {
        $logger = new class extends AbstractLogger {
            /** @var list<array{mixed, string, array<mixed>}> */
            public array $records = [];

            public function log($level, \Stringable|string $message, array $context = []): void
            {
                $this->records[] = [$level, (string) $message, $context];
            }
        };

        (new LogNotifier($logger))->send('camille@example.test', 'activation', ['token' => 'abc'], [['name' => 'rdv.ics', 'content' => '…', 'mime' => 'text/calendar']]);

        self::assertCount(1, $logger->records);
        [$level, $message, $context] = $logger->records[0];
        self::assertSame('info', $level);
        self::assertSame('[mail non envoyé] « activation » pour camille@example.test', $message);
        self::assertSame(['context' => ['token' => 'abc'], 'attachments' => ['rdv.ics']], $context);
    }
}
