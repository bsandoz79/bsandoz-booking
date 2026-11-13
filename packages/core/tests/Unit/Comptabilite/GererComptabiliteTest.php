<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Comptabilite;

use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Infrastructure\Settings\ConfiguredSettingsProvider;
use Bsandoz\Core\Comptabilite\Application\GererComptabilite;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryDepenses;
use Bsandoz\Core\Tests\Double\InMemoryReservationRepository;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

/** Comptabilité simple. Aujourd'hui : 10/11/2026. */
final class GererComptabiliteTest extends TestCase
{
    private FrozenClock $clock;
    private InMemoryReservationRepository $reservations;
    private InMemoryDepenses $depenses;
    private GererComptabilite $compta;
    private int $n = 0;

    protected function setUp(): void
    {
        $this->clock = new FrozenClock('2026-11-10 11:00');
        $this->reservations = new InMemoryReservationRepository();
        $this->depenses = new InMemoryDepenses();
        $settings = new ConfiguredSettingsProvider(
            ['min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 0, 'slot_step_min' => 60, 'free_cancel_hours' => 48, 'deposit_percent' => null, 'deposit_fixed_cents' => null, 'hold_minutes' => 10],
            null,
            'Europe/Paris',
        );
        $this->compta = new GererComptabilite($this->depenses, $this->reservations, $settings, new SequenceIdGenerator('d'), $this->clock);
    }

    /** @param list<array{id: string, nom: string, prixCents: int, quantite: int}>|null $produits */
    private function faite(string $debutUtc, int $totalCents, ?array $produits = null, bool $faite = true): void
    {
        $d = new \DateTimeImmutable($debutUtc, new \DateTimeZone('UTC'));
        $r = new Reservation('r-' . ++$this->n, 'u', 'p', null, [], new TimeRange($d, $d->modify('+1 hour')), 'a', 50.0, 1.8,
            Money::cents($totalCents), Money::zero(), Money::zero(), [], '', null, $produits, 1, false);
        $r->confirm();
        if ($faite) {
            $r->markDone($d->modify('+2 hours'));
        }
        $this->reservations->save($r);
    }

    public function testChiffreDAffairesDepensesEtResultatParMois(): void
    {
        $this->faite('2026-10-05 09:00', 6900, [['id' => 'm', 'nom' => 'Microfibre', 'prixCents' => 500, 'quantite' => 2]]);
        $this->faite('2026-10-31 23:30', 2900); // 1er novembre à Paris
        $this->faite('2026-11-03 09:00', 4500, faite: false); // pas encore faite : non comptée
        $this->compta->ajouter(['le' => '2026-10-12', 'libelle' => 'Produits de nettoyage', 'montantCents' => 3000]);
        $this->compta->ajouter(['le' => '2026-09-01', 'libelle' => 'Assurance', 'montantCents' => 4000, 'mensuelle' => true]);

        $b = $this->compta->bilan(2026);
        $mois = array_column($b['mois'], null, 'mois');

        self::assertSame([7900, 7000, 900], [$mois['2026-10']['chiffreAffairesCents'], $mois['2026-10']['depensesCents'], $mois['2026-10']['resultatCents']]);
        self::assertSame([2900, 4000], [$mois['2026-11']['chiffreAffairesCents'], $mois['2026-11']['depensesCents']]);
        self::assertSame(0, $mois['2026-08']['depensesCents']);
        self::assertSame(0, $mois['2026-12']['depensesCents'], 'mois à venir : pas encore de dépense mensuelle');
        self::assertSame(['chiffreAffairesCents' => 10800, 'depensesCents' => 15000, 'resultatCents' => -4200], $b['totaux']);
        self::assertSame(['Produits de nettoyage', 'Assurance'], array_column($b['depenses'], 'libelle'));
    }

    public function testRecettesParMoyenDePaiement(): void
    {
        $this->faite('2026-10-05 09:00', 6900); // marquée faite sans moyen
        $d = new \DateTimeImmutable('2026-10-06 09:00', new \DateTimeZone('UTC'));
        $r = new Reservation('r-carte', 'u', 'p', null, [], new TimeRange($d, $d->modify('+1 hour')), 'a', 50.0, 1.8,
            Money::cents(4500), Money::cents(1000), Money::zero(), [], '', null, null, 1, false);
        $r->confirm();
        $r->encaisser(\Bsandoz\Core\Booking\Domain\Model\MoyenPaiement::Carte, $d->modify('+1 hour'));
        $this->reservations->save($r);

        $parMoyen = $this->compta->bilan(2026)['parMoyenCents'];

        self::assertSame(1000, $parMoyen['enLigne'], 'acompte payé en ligne');
        self::assertSame(3500, $parMoyen['carte'], 'reste encaissé au terminal');
        self::assertSame(6900, $parMoyen['nonPrecise']);
        self::assertSame(0, $parMoyen['especes']);
    }

    public function testDepenseMensuelleArreteeGardeLHistorique(): void
    {
        $assurance = $this->compta->ajouter(['le' => '2026-09-01', 'libelle' => 'Assurance', 'montantCents' => 4000, 'mensuelle' => true]);
        $ponctuelle = $this->compta->ajouter(['le' => '2026-11-02', 'libelle' => 'Carburant', 'montantCents' => 6000]);

        $this->compta->retirer($assurance['id']);
        $this->compta->retirer($ponctuelle['id']);

        $b = $this->compta->bilan(2026);
        self::assertSame('2026-11-10', $b['depenses'][0]['finLe']);
        self::assertSame(12000, $b['totaux']['depensesCents']); // septembre, octobre, novembre
    }

    public function testDepenseInvalideRefusee(): void
    {
        $this->expectException(DomainError::class);
        $this->compta->ajouter(['le' => '2026-02-30', 'libelle' => 'X', 'montantCents' => 100]);
    }

    public function testMontantNulRefuse(): void
    {
        $this->expectException(DomainError::class);
        $this->compta->ajouter(['le' => '2026-02-03', 'libelle' => 'X', 'montantCents' => 0]);
    }
}
