<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Admin;

use Bsandoz\Core\Admin\Application\FichesClients;
use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Payment\Application\GererAvoirs;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryAvoirs;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use Bsandoz\Core\Tests\Double\InMemoryReservationRepository;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use PHPUnit\Framework\TestCase;

/** Fiches clients. Aujourd'hui : 10/11/2026. */
final class FichesClientsTest extends TestCase
{
    private FrozenClock $clock;
    private InMemoryReservationRepository $reservations;
    private InMemoryUserRepository $users;
    private GererAvoirs $avoirs;
    private int $n = 0;

    protected function setUp(): void
    {
        $this->clock = new FrozenClock('2026-11-10 11:00');
        $this->reservations = new InMemoryReservationRepository();
        $this->users = new InMemoryUserRepository();
        $this->users->save(new User('u-a', 'alice@example.test', 'Alice', 'Martin', '0600000001'));
        $this->users->save(new User('u-b', 'bruno@example.test', 'Bruno', 'Petit', '0600000002'));
        $supprime = new User('u-x', 'x@example.test', 'X', 'Y', '0600000003');
        $supprime->anonymize();
        $this->users->save($supprime);
        $this->avoirs = new GererAvoirs(new InMemoryAvoirs(), $this->clock);
    }

    private function fiches(): FichesClients
    {
        return new FichesClients($this->reservations, $this->users, $this->clock, new InMemoryPrestationRepository(new Prestation('p', 'Nettoyage', Money::cents(5000), 60)), $this->avoirs);
    }

    /** @param list<array{id: string, nom: string, prixCents: int, quantite: int}>|null $produits */
    private function rdv(string $user, string $debut, string $statut, int $totalCents = 5000, ?array $produits = null): void
    {
        $d = new \DateTimeImmutable($debut, new \DateTimeZone('UTC'));
        $r = new Reservation('r-' . ++$this->n, $user, 'p', null, [], new TimeRange($d, $d->modify('+1 hour')), 'adresse', 50.0, 1.8,
            Money::cents($totalCents), Money::zero(), Money::zero(), [], '', null, $produits, 1, false);
        if ($statut !== 'pending') {
            $r->confirm();
        }
        if ($statut === 'done') {
            $r->markDone($d->modify('+2 hours'));
        }
        $this->reservations->save($r);
    }

    public function testListeAvecDepenseVisitesEtClientsARelancer(): void
    {
        $this->rdv('u-a', '2026-03-01 09:00', 'done', 4000, [['id' => 'm', 'nom' => 'Microfibre', 'prixCents' => 500, 'quantite' => 2]]);
        $this->rdv('u-a', '2026-05-01 09:00', 'done', 6000);
        $this->rdv('u-b', '2026-11-01 09:00', 'done', 3000);
        $this->rdv('u-b', '2026-11-20 09:00', 'confirmed');
        $this->rdv('u-x', '2026-10-01 09:00', 'done');

        $liste = $this->fiches()->liste();

        self::assertSame(['Bruno Petit', 'Alice Martin'], array_column($liste, 'nom'));
        self::assertSame([1, 2], array_column($liste, 'visites'));
        self::assertSame([3000, 11000], array_column($liste, 'depenseCents'));
        self::assertSame([false, true], array_column($liste, 'aRelancer'));
        self::assertSame('2026-11-20T09:00:00+00:00', $liste[0]['prochainRdv']);
    }

    public function testFicheAvecHistoriqueEtAvoirCorrige(): void
    {
        $this->rdv('u-a', '2026-03-01 09:00', 'done', 4000);
        $this->rdv('u-a', '2026-05-01 09:00', 'done', 6000);

        self::assertSame(2500, $this->fiches()->changerAvoir('u-a', 2500));
        $fiche = $this->fiches()->fiche('u-a');

        self::assertSame(5000, $fiche['panierMoyenCents']);
        self::assertSame(2500, $fiche['avoirCents']);
        self::assertSame(['2026-05-01T09:00:00+00:00', '2026-03-01T09:00:00+00:00'], array_column($fiche['historique'], 'start'));
        self::assertSame('Nettoyage', $fiche['historique'][0]['prestation']);
    }

    public function testClientSupprimeIntrouvable(): void
    {
        $this->expectException(NotFound::class);
        $this->fiches()->fiche('u-x');
    }

    public function testAvoirNegatifRefuse(): void
    {
        $this->expectException(DomainError::class);
        $this->fiches()->changerAvoir('u-a', -100);
    }
}
