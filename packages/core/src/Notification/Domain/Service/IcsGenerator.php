<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Service;

use Bsandoz\Core\Shared\Domain\TimeRange;

/** Génère un événement iCalendar (.ics) et le flux iCal du pro. */
final class IcsGenerator
{
    /** @todo VCALENDAR/VEVENT (UID, DTSTAMP, DTSTART, DTEND en UTC, SUMMARY, LOCATION, DESCRIPTION), lignes CRLF, échappement. */
    public function event(string $uid, TimeRange $period, string $summary, string $location, string $description): string
    {
        throw new \LogicException('À implémenter');
    }

    /**
     * @param list<array{uid: string, period: TimeRange, summary: string, location: string, description: string}> $events
     * @todo Flux complet pour Google Agenda / Apple Calendrier.
     */
    public function feed(string $calendarName, array $events): string
    {
        throw new \LogicException('À implémenter');
    }
}
