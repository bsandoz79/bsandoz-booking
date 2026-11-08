<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration\Notification;

use Bsandoz\Core\Notification\Domain\Model\NotificationEnvoyee;
use Bsandoz\Core\Notification\Infrastructure\Persistence\DoctrineJournalNotifications;
use Bsandoz\Core\Tests\Integration\DoctrineTestCase;

final class DoctrineJournalNotificationsTest extends DoctrineTestCase
{
    public function testJournalDesNotificationsEnvoyees(): void
    {
        $journal = new DoctrineJournalNotifications($this->em);
        self::assertFalse($journal->dejaEnvoyee(NotificationEnvoyee::RAPPEL, 'r-1'));

        $journal->enregistrer(new NotificationEnvoyee('n-1', NotificationEnvoyee::RAPPEL, 'r-1', new \DateTimeImmutable('2026-11-09 17:00', new \DateTimeZone('UTC'))));
        $this->reload();

        self::assertTrue($journal->dejaEnvoyee(NotificationEnvoyee::RAPPEL, 'r-1'));
        self::assertFalse($journal->dejaEnvoyee(NotificationEnvoyee::RAPPEL, 'r-2'));
        self::assertFalse($journal->dejaEnvoyee('autre', 'r-1'));
    }
}
