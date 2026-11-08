<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Service;

use Bsandoz\Core\Shared\Domain\TimeRange;

/**
 * iCalendar (RFC 5545) : un événement (.ics joint aux mails) ou le flux complet du pro (Google Agenda, Apple Calendrier).
 * Dates en UTC, lignes terminées par CRLF et pliées à 75 octets, textes échappés.
 */
final class IcsGenerator
{
    private const PRODID = '-//bsandoz//booking//FR';

    public function event(string $uid, TimeRange $period, string $summary, string $location, string $description, ?\DateTimeImmutable $stamp = null): string
    {
        return $this->calendar(null, [['uid' => $uid, 'period' => $period, 'summary' => $summary, 'location' => $location, 'description' => $description]], $stamp);
    }

    /** @param list<array{uid: string, period: TimeRange, summary: string, location: string, description: string}> $events */
    public function feed(string $calendarName, array $events, ?\DateTimeImmutable $stamp = null): string
    {
        return $this->calendar($calendarName, $events, $stamp);
    }

    /** @param list<array{uid: string, period: TimeRange, summary: string, location: string, description: string}> $events */
    private function calendar(?string $name, array $events, ?\DateTimeImmutable $stamp): string
    {
        $stamp ??= new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:' . self::PRODID, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
        if ($name !== null) {
            $lines[] = 'X-WR-CALNAME:' . self::text($name);
        }

        foreach ($events as $event) {
            array_push(
                $lines,
                'BEGIN:VEVENT',
                'UID:' . self::text($event['uid']),
                'DTSTAMP:' . self::date($stamp),
                'DTSTART:' . self::date($event['period']->start),
                'DTEND:' . self::date($event['period']->end),
                'SUMMARY:' . self::text($event['summary']),
            );
            if ($event['location'] !== '') {
                $lines[] = 'LOCATION:' . self::text($event['location']);
            }
            if ($event['description'] !== '') {
                $lines[] = 'DESCRIPTION:' . self::text($event['description']);
            }
            $lines[] = 'END:VEVENT';
        }
        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", array_map(self::fold(...), $lines)) . "\r\n";
    }

    private static function date(\DateTimeImmutable $date): string
    {
        return $date->setTimezone(new \DateTimeZone('UTC'))->format('Ymd\THis\Z');
    }

    /** Échappement RFC 5545 : antislash, point-virgule, virgule, retours à la ligne. */
    private static function text(string $value): string
    {
        return str_replace(["\\", ';', ',', "\r\n", "\n", "\r"], ["\\\\", '\;', '\,', '\n', '\n', '\n'], $value);
    }

    /** Pliage à 75 octets sans couper un caractère UTF-8 ; les lignes suivantes commencent par une espace. */
    private static function fold(string $line): string
    {
        if (strlen($line) <= 75) {
            return $line;
        }

        $parts = [];
        $current = '';
        foreach (mb_str_split($line) as $char) {
            $limit = $parts === [] ? 75 : 74;
            if (strlen($current . $char) > $limit) {
                $parts[] = $current;
                $current = '';
            }
            $current .= $char;
        }
        $parts[] = $current;

        return implode("\r\n ", $parts);
    }
}
