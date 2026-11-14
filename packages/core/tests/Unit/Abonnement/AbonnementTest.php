<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Abonnement;

use Bsandoz\Core\Abonnement\Domain\Model\Abonnement;
use Bsandoz\Core\Abonnement\Domain\Model\Periodicite;
use Bsandoz\Core\Abonnement\Domain\Model\StatutAbonnement;
use PHPUnit\Framework\TestCase;

final class AbonnementTest extends TestCase
{
    private static function actif(Periodicite $p, string $debut, string $fin): Abonnement
    {
        $a = new Abonnement('a', 'u', 'f', $p, new \DateTimeImmutable($debut));
        $a->activer('sub', new \DateTimeImmutable($debut), new \DateTimeImmutable($fin));

        return $a;
    }

    public function testPeriodesMensuellesSansDeriveEnFinDeMois(): void
    {
        $a = self::actif(Periodicite::Mois, '2026-01-31 10:00', '2026-02-28 10:00');

        $mars = $a->periodeDe(new \DateTimeImmutable('2026-04-15 12:00'));
        self::assertNotNull($mars);
        // Chaque début est calculé depuis le 31 janvier (« +n months »), pas d'un mois sur l'autre.
        self::assertSame('2026-03-31', $mars->start->format('Y-m-d'));
        self::assertSame('2026-05-01', $mars->end->format('Y-m-d'));
        self::assertNull($a->periodeDe(new \DateTimeImmutable('2026-01-30')), 'avant le début : aucune période');
    }

    public function testQuinzaineEtSemaine(): void
    {
        $quinzaine = self::actif(Periodicite::Quinzaine, '2026-11-02 08:00', '2026-11-16 08:00');
        $p = $quinzaine->periodeDe(new \DateTimeImmutable('2026-11-20 09:00'));
        self::assertNotNull($p);
        self::assertSame(['2026-11-16', '2026-11-30'], [$p->start->format('Y-m-d'), $p->end->format('Y-m-d')]);

        $semaine = self::actif(Periodicite::Semaine, '2026-11-02 08:00', '2026-11-09 08:00');
        $s = $semaine->periodeDe(new \DateTimeImmutable('2026-11-09 08:00'));
        self::assertNotNull($s);
        self::assertSame('2026-11-09', $s->start->format('Y-m-d'), 'la fin d\'une période est le début de la suivante');
    }

    public function testCouvertureSelonStatutEtResiliation(): void
    {
        $a = self::actif(Periodicite::Mois, '2026-11-01 10:00', '2026-12-01 10:00');
        self::assertTrue($a->couvre(new \DateTimeImmutable('2027-02-10')), 'prélevé à chaque période : les mois suivants sont couverts');

        $a->demanderResiliation();
        self::assertTrue($a->couvre(new \DateTimeImmutable('2026-11-30')));
        self::assertFalse($a->couvre(new \DateTimeImmutable('2026-12-02')), 'résilié : jusqu\'à la fin de la période payée');

        $a->marquerImpaye();
        self::assertSame(StatutAbonnement::Impaye, $a->statut());
        self::assertFalse($a->couvre(new \DateTimeImmutable('2026-11-20')));
        $a->renouveler(new \DateTimeImmutable('2026-12-01 10:00'));
        self::assertSame(StatutAbonnement::Actif, $a->statut(), 'prélèvement finalement encaissé');
    }
}
