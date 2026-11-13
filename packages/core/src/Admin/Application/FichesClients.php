<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Application;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Fidelite\Application\GererFidelite;
use Bsandoz\Core\Payment\Application\GererAvoirs;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Fiches clients du pro, tirées des réservations (5 dernières années et à venir) : total dépensé (prestations faites,
 * produits compris), nombre de visites, panier moyen, dernière visite, prochain rendez-vous, client à relancer
 * (dernière visite il y a plus de TableauDeBord::JOURS_RELANCE jours et rien de prévu), avoir et carte de fidélité.
 * Les comptes supprimés (anonymisés) n'apparaissent pas.
 *
 * @phpstan-type Resume array{userId: string, nom: string, email: string, phone: string, visites: int, depenseCents: int, derniereVisite: string|null, prochainRdv: string|null, aRelancer: bool}
 */
final class FichesClients
{
    public function __construct(
        private ReservationRepository $reservations,
        private UserRepository $users,
        private Clock $clock,
        private ?PrestationRepository $prestations = null,
        private ?GererAvoirs $avoirs = null,
        private ?GererFidelite $fidelite = null,
    ) {
    }

    /** @return list<Resume> du plus récent au plus ancien (dernière visite ou prochain rendez-vous) */
    public function liste(): array
    {
        $fiches = [];
        foreach ($this->parClient() as $userId => $liste) {
            $user = $this->user($userId);
            if ($user !== null) {
                $fiches[] = $this->resume($user, $liste);
            }
        }
        usort($fiches, static fn (array $a, array $b): int => strcmp((string) ($b['prochainRdv'] ?? $b['derniereVisite']), (string) ($a['prochainRdv'] ?? $a['derniereVisite'])));

        return $fiches;
    }

    /**
     * @return array<string, mixed> résumé, panier moyen, avoir, fidélité et historique
     * @throws NotFound client inconnu ou supprimé
     */
    public function fiche(string $userId): array
    {
        $user = $this->user($userId) ?? throw new NotFound('Client introuvable.');
        $liste = $this->parClient()[$userId] ?? [];
        $resume = $this->resume($user, $liste);
        usort($liste, static fn (Reservation $a, Reservation $b): int => $b->period()->start <=> $a->period()->start);

        return $resume + [
            'panierMoyenCents' => $resume['visites'] === 0 ? 0 : intdiv($resume['depenseCents'], $resume['visites']),
            'avoirCents' => $this->avoirs?->solde($userId)->cents ?? 0,
            'fidelite' => $this->fidelite?->carte($userId),
            'historique' => array_map(fn (Reservation $r): array => [
                'id' => $r->id(),
                'start' => self::iso($r->period()->start),
                'status' => $r->status()->value,
                'prestation' => $this->nomPrestation($r->prestationId()),
                'quantite' => $r->quantite(),
                'totalCents' => $r->total()->add($r->totalProduits())->cents,
            ], $liste),
        ];
    }

    /**
     * Correction de l'avoir par le pro (ex. geste commercial, avoir utilisé hors site).
     *
     * @throws NotFound|DomainError
     */
    public function changerAvoir(string $userId, mixed $cents): int
    {
        $this->user($userId) ?? throw new NotFound('Client introuvable.');
        if (!is_int($cents) || $cents < 0) {
            throw new DomainError('« avoirCents » : montant en centimes, positif ou nul.');
        }
        if ($this->avoirs === null) {
            throw new DomainError('Les avoirs ne sont pas disponibles.');
        }

        return $this->avoirs->definir($userId, Money::cents($cents))->cents;
    }

    /** @return array<string, list<Reservation>> réservations utiles (confirmées, faites, absences, annulées) par client */
    private function parClient(): array
    {
        $now = $this->clock->now();
        $parClient = [];
        foreach ($this->reservations->between($now->modify('-5 years'), $now->modify('+2 years')) as $r) {
            if (in_array($r->status(), [ReservationStatus::Confirmed, ReservationStatus::Done, ReservationStatus::NoShow, ReservationStatus::Cancelled], true)) {
                $parClient[$r->userId()][] = $r;
            }
        }

        return $parClient;
    }

    /**
     * @param list<Reservation> $liste
     * @return Resume
     */
    private function resume(User $user, array $liste): array
    {
        $now = $this->clock->now();
        $faites = array_values(array_filter($liste, static fn (Reservation $r): bool => $r->status() === ReservationStatus::Done));
        $aVenir = array_values(array_filter($liste, static fn (Reservation $r): bool => $r->status() === ReservationStatus::Confirmed && $r->period()->start >= $now));
        $derniere = $faites === [] ? null : max(array_map(static fn (Reservation $r): \DateTimeImmutable => $r->period()->start, $faites));
        $prochain = $aVenir === [] ? null : min(array_map(static fn (Reservation $r): \DateTimeImmutable => $r->period()->start, $aVenir));

        return [
            'userId' => $user->id(),
            'nom' => trim($user->firstname() . ' ' . $user->lastname()),
            'email' => $user->email(),
            'phone' => $user->phone(),
            'visites' => count($faites),
            'depenseCents' => array_sum(array_map(static fn (Reservation $r): int => $r->total()->add($r->totalProduits())->cents, $faites)),
            'derniereVisite' => $derniere === null ? null : self::iso($derniere),
            'prochainRdv' => $prochain === null ? null : self::iso($prochain),
            'aRelancer' => $prochain === null && $derniere !== null && $derniere < $now->modify(sprintf('-%d days', TableauDeBord::JOURS_RELANCE)),
        ];
    }

    private function user(string $userId): ?User
    {
        try {
            $user = $this->users->get($userId);
        } catch (NotFound) {
            return null;
        }

        return $user->canLogIn() || $user->firstname() !== '' || $user->phone() !== '' ? $user : null;
    }

    private function nomPrestation(string $id): string
    {
        try {
            return $this->prestations?->get($id)->name() ?? '';
        } catch (NotFound) {
            return '';
        }
    }

    private static function iso(\DateTimeImmutable $d): string
    {
        return $d->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM);
    }
}
