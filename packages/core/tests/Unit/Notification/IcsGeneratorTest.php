<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Notification;

use Bsandoz\Core\Notification\Domain\Service\IcsGenerator;
use Bsandoz\Core\Shared\Domain\TimeRange;
use PHPUnit\Framework\TestCase;

final class IcsGeneratorTest extends TestCase
{
    private static function period(string $start, string $end, string $tz = 'Europe/Paris'): TimeRange
    {
        $zone = new \DateTimeZone($tz);

        return new TimeRange(new \DateTimeImmutable($start, $zone), new \DateTimeImmutable($end, $zone));
    }

    private static function stamp(): \DateTimeImmutable
    {
        return new \DateTimeImmutable('2026-11-07 10:00', new \DateTimeZone('UTC'));
    }

    public function testEvenementEnUtcAvecFinsDeLigneCrlf(): void
    {
        $ics = (new IcsGenerator())->event('r-1@bsandoz', self::period('2026-11-10 09:00', '2026-11-10 11:30'), 'Rendez-vous', '1 rue de l\'Exemple', 'Prestation', self::stamp());

        self::assertSame(
            "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//bsandoz//booking//FR\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n"
            . "BEGIN:VEVENT\r\nUID:r-1@bsandoz\r\nDTSTAMP:20261107T100000Z\r\nDTSTART:20261110T080000Z\r\nDTEND:20261110T103000Z\r\n"
            . "SUMMARY:Rendez-vous\r\nLOCATION:1 rue de l'Exemple\r\nDESCRIPTION:Prestation\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n",
            $ics,
        );
    }

    public function testEchappementDesCaracteresSpeciaux(): void
    {
        $ics = (new IcsGenerator())->event('u', self::period('2026-11-10 09:00', '2026-11-10 10:00'), 'A; B, C', 'Rue\\Place', "Ligne 1\nLigne 2", self::stamp());

        self::assertStringContainsString("SUMMARY:A\\; B\\, C\r\n", $ics);
        self::assertStringContainsString("LOCATION:Rue\\\\Place\r\n", $ics);
        self::assertStringContainsString("DESCRIPTION:Ligne 1\\nLigne 2\r\n", $ics);
    }

    public function testLignesLonguesPlieesSansCouperLesAccents(): void
    {
        $description = str_repeat('Équipement été ', 12);
        $ics = (new IcsGenerator())->event('u', self::period('2026-11-10 09:00', '2026-11-10 10:00'), 'R', '', $description, self::stamp());

        foreach (explode("\r\n", $ics) as $line) {
            self::assertLessThanOrEqual(75, strlen($line));
            self::assertTrue(mb_check_encoding($line, 'UTF-8'), 'aucun caractère coupé');
        }
        $deplie = str_replace("\r\n ", '', $ics);
        self::assertStringContainsString('DESCRIPTION:' . $description, $deplie);
        self::assertStringNotContainsString('LOCATION', $ics, 'champ vide omis');
    }

    public function testFluxDuPro(): void
    {
        $ics = (new IcsGenerator())->feed('Agenda', [
            ['uid' => 'r-1', 'period' => self::period('2026-11-10 09:00', '2026-11-10 10:00'), 'summary' => 'Un', 'location' => '', 'description' => ''],
            ['uid' => 'r-2', 'period' => self::period('2026-11-11 14:00', '2026-11-11 15:00'), 'summary' => 'Deux', 'location' => '', 'description' => ''],
        ], self::stamp());

        self::assertStringContainsString("X-WR-CALNAME:Agenda\r\n", $ics);
        self::assertSame(2, substr_count($ics, 'BEGIN:VEVENT'));
        self::assertStringContainsString("DTSTART:20261111T130000Z\r\n", $ics);
    }

    public function testFluxVide(): void
    {
        $ics = (new IcsGenerator())->feed('Agenda', [], self::stamp());

        self::assertStringStartsWith("BEGIN:VCALENDAR\r\n", $ics);
        self::assertStringEndsWith("END:VCALENDAR\r\n", $ics);
        self::assertStringNotContainsString('VEVENT', $ics);
    }
}
