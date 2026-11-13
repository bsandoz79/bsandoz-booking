<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Admin;

use Bsandoz\Core\Admin\Application\TableauDeBord;
use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Infrastructure\Settings\ConfiguredSettingsProvider;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Model\Produit;
use Bsandoz\Core\Facturation\Application\InfosFacturation;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use Bsandoz\Core\Tests\Double\InMemoryProduitRepository;
use Bsandoz\Core\Tests\Double\InMemoryReservationRepository;
use Bsandoz\Core\Tests\Double\InMemorySettingRepository;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use PHPUnit\Framework\TestCase;

/** Tableau de bord : journée, choses à faire, chiffres, clients. Aujourd'hui : mardi 10/11/2026, 12:00 à Paris. */
final class TableauDeBordTest extends TestCase
{
    private FrozenClock $clock;
    private InMemoryReservationRepository $reservations;
    private InMemoryUserRepository $users;
    private int $n = 0;

    protected function setUp(): void
    {
        $this->clock = new FrozenClock('2026-11-10 11:00');
        $this->reservations = new InMemoryReservationRepository();
        $this->users = new InMemoryUserRepository();
        foreach ([['u-a', 'Alice', 'Martin'], ['u-b', 'Bruno', 'Petit'], ['u-c', 'Chloé', 'Durand']] as [$id, $prenom, $nom]) {
            $this->users->save(new User($id, $id . '@example.test', $prenom, $nom, '0600000000'));
        }
    }

    private function tableau(?InfosFacturation $facturation = null): TableauDeBord
    {
        $settings = new ConfiguredSettingsProvider(
            ['min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 0, 'slot_step_min' => 60, 'free_cancel_hours' => 48, 'deposit_percent' => null, 'deposit_fixed_cents' => null, 'hold_minutes' => 10],
            null,
            'Europe/Paris',
        );

        return new TableauDeBord(
            $this->reservations, $settings, $this->clock, $this->users,
            new InMemoryPrestationRepository(new Prestation('p', 'Nettoyage', Money::cents(5000), 60)),
            new InMemoryProduitRepository(new Produit('micro', 'Microfibre', Money::cents(500), 1), new Produit('cire', 'Cire', Money::cents(900), 8)),
            $facturation,
        );
    }

    /** @param list<array{id: string, nom: string, prixCents: int, quantite: int}>|null $produits */
    private function rdv(string $user, string $debutUtc, string $statut = 'confirmed', ?array $produits = null, int $totalCents = 5000): Reservation
    {
        $debut = new \DateTimeImmutable($debutUtc, new \DateTimeZone('UTC'));
        $r = new Reservation('r-' . ++$this->n, $user, 'p', null, [], new TimeRange($debut, $debut->modify('+1 hour')), '1 rue Test, Abbeville', 50.1, 1.8,
            Money::cents($totalCents), Money::zero(), Money::zero(), [], '', null, $produits, 1, false);
        if ($statut !== 'pending') {
            $r->confirm();
        }
        if ($statut === 'done') {
            $r->markDone($debut->modify('+2 hours'));
        }
        $this->reservations->save($r);

        return $r;
    }

    public function testMaJourneeDansLOrdreAvecLesProduitsACharger(): void
    {
        $this->rdv('u-b', '2026-11-10 14:00', produits: [['id' => 'micro', 'nom' => 'Microfibre', 'prixCents' => 500, 'quantite' => 1]]);
        $this->rdv('u-a', '2026-11-10 08:00', 'done', [['id' => 'micro', 'nom' => 'Microfibre', 'prixCents' => 500, 'quantite' => 3]]);
        $this->rdv('u-c', '2026-11-10 15:30', produits: [['id' => 'micro', 'nom' => 'Microfibre', 'prixCents' => 500, 'quantite' => 2]]);
        $this->rdv('u-c', '2026-11-11 09:00');

        $t = $this->tableau()();

        self::assertSame(['Alice Martin', 'Bruno Petit', 'Chloé Durand'], array_column($t['journee'], 'client'));
        self::assertSame(['done', 'confirmed', 'confirmed'], array_column($t['journee'], 'status'));
        self::assertSame('Nettoyage', $t['journee'][1]['prestation']);
        self::assertSame(5500, $t['journee'][1]['resteSurPlaceCents']);
        // Ce qui reste à faire aujourd'hui : 1 + 2 microfibres (celle du rendez-vous déjà fait est livrée).
        self::assertSame([['nom' => 'Microfibre', 'quantite' => 3]], $t['aCharger']);
        // Prochain rendez-vous (à venir) : prestation et coordonnées pour le GPS.
        self::assertSame(['Bruno Petit', 'Nettoyage', 50.1], [$t['next'][0]['client'], $t['next'][0]['prestation'], $t['next'][0]['lat']]);
    }

    public function testChosesAFaire(): void
    {
        $this->rdv('u-a', '2026-11-09 09:00');           // passé, ni fait ni absent
        $this->rdv('u-b', '2026-11-20 09:00', 'pending'); // paiement en attente (blocage en cours)

        $t = ($this->tableau(new InfosFacturation(new InMemorySettingRepository())))();
        $types = array_column($t['aFaire'], 'type');

        self::assertContains('statut', $types);
        self::assertContains('stock', $types);
        self::assertContains('facturation', $types);
        $stock = array_values(array_filter($t['aFaire'], static fn (array $a): bool => $a['type'] === 'stock'));
        self::assertSame([['type' => 'stock', 'produit' => 'Microfibre', 'stock' => 1]], $stock);
        $statut = array_values(array_filter($t['aFaire'], static fn (array $a): bool => $a['type'] === 'statut'))[0];
        self::assertSame('Alice Martin', $statut['client']);
    }

    public function testChiffresDuMoisEtDuMoisPrecedent(): void
    {
        $this->rdv('u-a', '2026-11-03 09:00', 'done', totalCents: 4000);
        $this->rdv('u-b', '2026-11-12 09:00', totalCents: 8000);
        $this->rdv('u-c', '2026-10-20 09:00', 'done', totalCents: 3000);

        $c = $this->tableau()()['chiffres'];

        self::assertSame(12000, $c['moisCents']);
        self::assertSame(3000, $c['moisPrecedentCents']);
        self::assertSame(2, $c['rendezVousMois']);
        self::assertSame(6000, $c['panierMoyenCents']);
    }

    public function testNouveauxClientsEtClientsARelancer(): void
    {
        $this->rdv('u-a', '2026-06-01 09:00', 'done');  // plus de 90 jours, rien de prévu : à relancer
        $this->rdv('u-b', '2026-05-01 09:00', 'done');  // ancien mais revient bientôt
        $this->rdv('u-b', '2026-11-25 09:00');
        $this->rdv('u-c', '2026-11-05 09:00', 'done');  // nouveau ce mois-ci

        $c = $this->tableau()()['clients'];

        self::assertSame(1, $c['nouveauxMois']);
        self::assertSame(['Alice Martin'], array_column($c['aRelancer'], 'client'));
    }
}
