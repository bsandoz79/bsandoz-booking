<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Application;

use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Catalog\Domain\Port\ProduitRepository;
use Bsandoz\Core\Facturation\Application\InfosFacturation;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Tableau de bord du pro (heure locale).
 *
 * - Compteurs : rendez-vous du jour et de la semaine, chiffre d'affaires du mois (rendez-vous confirmés ou faits),
 *   réservations en attente de paiement, taux d'annulation du mois, prochains rendez-vous (client et téléphone).
 * - `journee` : rendez-vous du jour dans l'ordre (adresse, coordonnées, prestation, produits à apporter, reste à encaisser).
 * - `aCharger` : produits à emporter pour la journée, additionnés.
 * - `aFaire` : paiements en attente, rendez-vous passés à marquer faits ou absents, stock bas, informations de
 *   facturation à compléter.
 * - `chiffres` : mois en cours et mois précédent, panier moyen, produits vendus.
 * - `clients` : nouveaux clients du mois, clients à relancer (dernière visite il y a plus de JOURS_RELANCE jours, rien de prévu).
 */
final class TableauDeBord
{
    private const PROCHAINS = 5;
    public const JOURS_RELANCE = 90;
    public const STOCK_BAS = 2;
    private const A_RELANCER_MAX = 10;

    public function __construct(
        private ReservationRepository $reservations,
        private SettingsProvider $settings,
        private Clock $clock,
        private ?UserRepository $users = null,
        private ?PrestationRepository $prestations = null,
        private ?ProduitRepository $produits = null,
        private ?InfosFacturation $facturation = null,
    ) {
    }

    /** @return array<string, mixed> */
    public function __invoke(): array
    {
        $now = $this->clock->now();
        $local = $now->setTimezone($this->settings->timezone());
        $jour = $local->setTime(0, 0);
        $semaine = $jour->modify('monday this week');
        $mois = $jour->modify('first day of this month');
        $moisPrecedent = $mois->modify('-1 month');

        $duJour = $this->trier($this->reservations->between($jour, $jour->modify('+1 day')));
        $deLaSemaine = $this->reservations->between($semaine, $semaine->modify('+7 days'));
        $duMois = $this->reservations->between($mois, $mois->modify('+1 month'));
        $duMoisPrecedent = $this->reservations->between($moisPrecedent, $mois);

        $moisConfirmes = self::confirmes($duMois);
        $annules = count(array_filter($duMois, static fn (Reservation $r): bool => $r->status() === ReservationStatus::Cancelled));
        $base = count($moisConfirmes) + $annules + count(array_filter($duMois, static fn (Reservation $r): bool => $r->status() === ReservationStatus::NoShow));

        $futur = $this->reservations->between($now, $now->modify('+366 days'));
        $aVenir = array_values(array_filter($futur, static fn (Reservation $r): bool => $r->status() === ReservationStatus::Confirmed && $r->period()->start >= $now));
        $revenu = self::revenu($moisConfirmes);

        $journee = array_values(array_filter($duJour, static fn (Reservation $r): bool => in_array($r->status(), [ReservationStatus::Confirmed, ReservationStatus::Done], true)
            || ($r->status() === ReservationStatus::PendingPayment && $r->blocks($now))));

        return [
            'today' => count(self::confirmes($duJour)),
            'week' => count(self::confirmes($deLaSemaine)),
            'monthRevenueCents' => $revenu,
            'monthBookings' => count($moisConfirmes),
            'pendingPayments' => count(array_filter($futur, static fn (Reservation $r): bool => $r->status() === ReservationStatus::PendingPayment && $r->blocks($now))),
            'monthCancellationRate' => $base === 0 ? 0.0 : round($annules / $base, 3),
            'next' => array_map(fn (Reservation $r): array => [
                'id' => $r->id(),
                'start' => self::iso($r->period()->start),
                'address' => $r->address(),
            ] + $this->client($r->userId()), array_slice($aVenir, 0, self::PROCHAINS)),
            'journee' => array_map(fn (Reservation $r): array => $this->rendezVous($r), $journee),
            'aCharger' => self::produitsAdditionnes(array_filter($journee, static fn (Reservation $r): bool => $r->status() !== ReservationStatus::Done)),
            'aFaire' => $this->aFaire($now),
            'chiffres' => [
                'moisCents' => $revenu,
                'moisPrecedentCents' => self::revenu(self::confirmes($duMoisPrecedent)),
                'rendezVousMois' => count($moisConfirmes),
                'panierMoyenCents' => $moisConfirmes === [] ? 0 : intdiv($revenu, count($moisConfirmes)),
                'produitsMoisCents' => array_sum(array_map(static fn (Reservation $r): int => $r->totalProduits()->cents, $moisConfirmes)),
            ],
            'clients' => $this->clients($now, $mois),
        ];
    }

    /** @return array<string, mixed> */
    private function rendezVous(Reservation $r): array
    {
        return [
            'id' => $r->id(),
            'start' => self::iso($r->period()->start),
            'end' => self::iso($r->period()->end),
            'status' => $r->status()->value,
            'address' => $r->address(),
            'lat' => $r->lat(),
            'lng' => $r->lng(),
            'prestation' => $this->nomPrestation($r->prestationId()),
            'quantite' => $r->quantite(),
            'produits' => array_map(static fn (array $p): array => ['nom' => $p['nom'], 'quantite' => $p['quantite']], $r->produits()),
            'resteSurPlaceCents' => $r->resteSurPlace()->cents,
            'notes' => $r->notes(),
        ] + $this->client($r->userId());
    }

    /** @return list<array<string, mixed>> */
    private function aFaire(\DateTimeImmutable $now): array
    {
        $taches = [];
        foreach ($this->trier($this->reservations->between($now, $now->modify('+366 days'))) as $r) {
            if ($r->status() === ReservationStatus::PendingPayment && $r->blocks($now)) {
                $taches[] = ['type' => 'paiement', 'reservationId' => $r->id(), 'start' => self::iso($r->period()->start)] + $this->client($r->userId());
            }
        }
        foreach ($this->trier($this->reservations->between($now->modify('-30 days'), $now)) as $r) {
            if ($r->status() === ReservationStatus::Confirmed && $r->period()->end <= $now) {
                $taches[] = ['type' => 'statut', 'reservationId' => $r->id(), 'start' => self::iso($r->period()->start)] + $this->client($r->userId());
            }
        }
        foreach ($this->produits?->all() ?? [] as $produit) {
            if ($produit->actif() && $produit->stock() <= self::STOCK_BAS) {
                $taches[] = ['type' => 'stock', 'produit' => $produit->nom(), 'stock' => $produit->stock()];
            }
        }
        if ($this->facturation !== null && in_array(InfosFacturation::A_COMPLETER, $this->facturation->vendeur(), true)) {
            $taches[] = ['type' => 'facturation'];
        }

        return $taches;
    }

    /** @return array{nouveauxMois: int, aRelancer: list<array<string, mixed>>} */
    private function clients(\DateTimeImmutable $now, \DateTimeImmutable $mois): array
    {
        $toutes = $this->reservations->between($now->modify('-3 years'), $now->modify('+366 days'));
        /** @var array<string, array{premiere: \DateTimeImmutable, derniereVisite: ?\DateTimeImmutable, prevu: bool}> $parClient */
        $parClient = [];
        foreach ($toutes as $r) {
            if (!in_array($r->status(), [ReservationStatus::Confirmed, ReservationStatus::Done], true)) {
                continue;
            }
            $debut = $r->period()->start;
            $c = $parClient[$r->userId()] ?? ['premiere' => $debut, 'derniereVisite' => null, 'prevu' => false];
            $c['premiere'] = min($c['premiere'], $debut);
            if ($r->status() === ReservationStatus::Done && ($c['derniereVisite'] === null || $debut > $c['derniereVisite'])) {
                $c['derniereVisite'] = $debut;
            }
            $c['prevu'] = $c['prevu'] || ($r->status() === ReservationStatus::Confirmed && $debut >= $now);
            $parClient[$r->userId()] = $c;
        }

        $limite = $now->modify(sprintf('-%d days', self::JOURS_RELANCE));
        $aRelancer = [];
        foreach ($parClient as $userId => $c) {
            if (!$c['prevu'] && $c['derniereVisite'] !== null && $c['derniereVisite'] < $limite) {
                $aRelancer[] = ['userId' => $userId, 'derniereVisite' => self::iso($c['derniereVisite'])] + $this->client($userId);
            }
        }
        usort($aRelancer, static fn (array $a, array $b): int => strcmp((string) $a['derniereVisite'], (string) $b['derniereVisite']));

        return [
            'nouveauxMois' => count(array_filter($parClient, static fn (array $c): bool => $c['premiere'] >= $mois)),
            'aRelancer' => array_slice($aRelancer, 0, self::A_RELANCER_MAX),
        ];
    }

    /**
     * @param array<Reservation> $liste
     * @return list<array{nom: string, quantite: int}>
     */
    private static function produitsAdditionnes(array $liste): array
    {
        $total = [];
        foreach ($liste as $r) {
            foreach ($r->produits() as $p) {
                $total[$p['nom']] = ($total[$p['nom']] ?? 0) + $p['quantite'];
            }
        }

        return array_map(static fn (string $nom, int $quantite): array => ['nom' => $nom, 'quantite' => $quantite], array_keys($total), array_values($total));
    }

    /**
     * @param list<Reservation> $liste
     * @return list<Reservation>
     */
    private function trier(array $liste): array
    {
        usort($liste, static fn (Reservation $a, Reservation $b): int => $a->period()->start <=> $b->period()->start);

        return $liste;
    }

    /**
     * @param array<Reservation> $liste
     * @return list<Reservation>
     */
    private static function confirmes(array $liste): array
    {
        return array_values(array_filter($liste, static fn (Reservation $r): bool => in_array($r->status(), [ReservationStatus::Confirmed, ReservationStatus::Done], true)));
    }

    /** @param list<Reservation> $liste */
    private static function revenu(array $liste): int
    {
        return array_sum(array_map(static fn (Reservation $r): int => $r->total()->cents, $liste));
    }

    private function nomPrestation(string $id): string
    {
        try {
            return $this->prestations?->get($id)->name() ?? '';
        } catch (NotFound) {
            return '';
        }
    }

    /** @return array{client: string, phone: string} */
    private function client(string $userId): array
    {
        try {
            $user = $this->users?->get($userId);
        } catch (NotFound) {
            $user = null;
        }

        return ['client' => $user === null ? '' : trim($user->firstname() . ' ' . $user->lastname()), 'phone' => $user?->phone() ?? ''];
    }

    private static function iso(\DateTimeImmutable $d): string
    {
        return $d->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM);
    }
}
