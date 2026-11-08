<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Application\GererDisponibilites;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Tests\Double\InMemoryAvailabilityRepository;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

final class GererDisponibilitesTest extends TestCase
{
    private GererDisponibilites $dispo;

    protected function setUp(): void
    {
        $this->dispo = new GererDisponibilites(new InMemoryAvailabilityRepository(), new SequenceIdGenerator('d'));
    }

    private static function utc(string $date): \DateTimeImmutable
    {
        return new \DateTimeImmutable($date, new \DateTimeZone('UTC'));
    }

    public function testDefinirLaSemaine(): void
    {
        $horaires = $this->dispo->definirHoraires([
            ['weekday' => 2, 'startsAt' => '14:00', 'endsAt' => '18:00'],
            ['weekday' => 2, 'startsAt' => '08:00', 'endsAt' => '12:00'],
            ['weekday' => 6, 'startsAt' => '09:00', 'endsAt' => '12:00'],
        ]);

        self::assertSame(['2 08:00', '2 14:00', '6 09:00'], array_map(static fn (array $h): string => $h['weekday'] . ' ' . $h['startsAt'], $horaires));

        $this->dispo->definirHoraires([['weekday' => 1, 'startsAt' => '08:00', 'endsAt' => '17:00']]);
        self::assertCount(1, $this->dispo->horaires(), 'la semaine est remplacée');
    }

    public function testPlagesQuiSeChevauchentRefusees(): void
    {
        $this->expectException(DomainError::class);
        $this->dispo->definirHoraires([
            ['weekday' => 2, 'startsAt' => '08:00', 'endsAt' => '12:00'],
            ['weekday' => 2, 'startsAt' => '11:00', 'endsAt' => '14:00'],
        ]);
    }

    public function testPlageInvalideRefusee(): void
    {
        $this->expectException(DomainError::class);
        $this->dispo->definirHoraires([['weekday' => 8, 'startsAt' => '08:00', 'endsAt' => '12:00']]);
    }

    public function testPlageIncompleteRefusee(): void
    {
        $this->expectException(DomainError::class);
        $this->dispo->definirHoraires([['weekday' => 2, 'startsAt' => '08:00']]);
    }

    public function testIndisponibilites(): void
    {
        $id = $this->dispo->ajouterIndisponibilite(self::utc('2026-12-24 00:00'), self::utc('2027-01-02 00:00'), ' Congés de fin d\'année ');
        $this->dispo->ajouterIndisponibilite(self::utc('2027-03-01 08:00'), self::utc('2027-03-01 12:00'), 'Garage');

        $decembre = $this->dispo->indisponibilites(self::utc('2026-12-01'), self::utc('2027-01-01'));
        self::assertSame([['id' => $id, 'start' => '2026-12-24T00:00:00+00:00', 'end' => '2027-01-02T00:00:00+00:00', 'reason' => 'Congés de fin d\'année']], $decembre);

        $this->dispo->supprimerIndisponibilite($id);
        self::assertSame([], $this->dispo->indisponibilites(self::utc('2026-12-01'), self::utc('2027-01-01')));
    }

    public function testIndisponibiliteInverseeRefusee(): void
    {
        $this->expectException(DomainError::class);
        $this->dispo->ajouterIndisponibilite(self::utc('2026-12-24'), self::utc('2026-12-23'));
    }

    public function testSuppressionInconnue(): void
    {
        $this->expectException(NotFound::class);
        $this->dispo->supprimerIndisponibilite('inconnue');
    }
}
