<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Payment\Application\CreerSessionAcompte;
use Bsandoz\Core\Payment\Application\RembourserAcompte;
use Bsandoz\Core\Fidelite\Application\GererFidelite;
use Bsandoz\Core\Catalog\Application\StockProduits;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Rendez-vous dans l'espace pro : planning, statut (fait / absent), annulation (remboursement au choix du pro),
 * remboursement partiel ou total, et rendez-vous pris par téléphone (confirmé tout de suite ou lien d'acompte par mail).
 */
final class GererRendezVousPro
{
    public function __construct(
        private ReservationRepository $reservations,
        private UserRepository $users,
        private PrestationRepository $prestations,
        private ReserverCreneau $reserver,
        private CreerSessionAcompte $sessionAcompte,
        private RembourserAcompte $rembourser,
        private NotificationsReservation $notifications,
        private Clock $clock,
        private ?GererFidelite $fidelite = null,
        private ?StockProduits $stock = null,
    ) {
    }

    /** @return list<array<string, mixed>> rendez-vous de la période (hors blocages de paiement abandonnés) */
    public function planning(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $planning = [];
        foreach ($this->reservations->between($from, $to) as $r) {
            if ($r->status() === ReservationStatus::Expired) {
                continue;
            }
            $planning[] = $this->vue($r);
        }

        return $planning;
    }

    /** @throws NotFound|DomainError statut inconnu ou changement impossible */
    public function changerStatut(string $id, string $statut): void
    {
        $r = $this->reservations->get($id);
        $now = $this->clock->now();
        match ($statut) {
            ReservationStatus::Done->value => $r->markDone($now),
            ReservationStatus::NoShow->value => $r->markNoShow($now),
            default => throw new DomainError('Statut attendu : « done » (fait) ou « no_show » (absent).'),
        };
        $this->reservations->save($r);
        // Prestation réalisée : un tampon (sauf pour la prestation remisée, qui clôt la carte).
        if ($statut === ReservationStatus::Done->value && $r->remiseFidelite()->cents === 0) {
            $this->fidelite?->tamponner($r->userId());
        }
    }

    /**
     * @return Money montant remboursé
     * @throws NotFound|DomainError
     */
    public function annuler(string $id, bool $rembourser): Money
    {
        $r = $this->reservations->get($id);
        $r->cancelByPro($this->clock->now());
        $this->reservations->save($r);
        if ($r->remiseFidelite()->cents > 0) {
            $this->fidelite?->rendreRemise($r->userId());
        }
        $this->stock?->remettre($r->produits());
        $rembourse = $rembourser ? ($this->rembourser)($r->id()) : Money::zero();
        $this->notifications->annulee($r, $rembourse->cents > 0);

        return $rembourse;
    }

    /** @throws NotFound|DomainError */
    public function rembourser(string $id, ?int $amountCents): Money
    {
        $this->reservations->get($id);

        return ($this->rembourser)($id, $amountCents);
    }

    /**
     * Rendez-vous pris par téléphone : même contrôles qu'une réservation en ligne (créneau libre, zone),
     * puis confirmé tout de suite, ou en attente avec le lien d'acompte envoyé au client.
     *
     * @return array{reservationId: string, status: string, paymentUrl: string|null}
     * @throws DomainError
     */
    public function ajouterParTelephone(ReserverCreneauCommand $command, bool $envoyerLienAcompte): array
    {
        $cree = ($this->reserver)($command);
        $r = $this->reservations->get($cree->reservationId);
        if ($r->status() !== ReservationStatus::PendingPayment) {
            return ['reservationId' => $r->id(), 'status' => $r->status()->value, 'paymentUrl' => null];
        }

        if ($envoyerLienAcompte) {
            $url = ($this->sessionAcompte)($r->id());
            $this->notifications->lienAcompte($r, $url);

            return ['reservationId' => $r->id(), 'status' => $r->status()->value, 'paymentUrl' => $url];
        }

        $r->confirm();
        $this->reservations->save($r);
        $this->notifications->confirmee($r, $cree->manageToken);

        return ['reservationId' => $r->id(), 'status' => $r->status()->value, 'paymentUrl' => null];
    }

    /** @return array<string, mixed> */
    private function vue(Reservation $r): array
    {
        $utc = new \DateTimeZone('UTC');
        try {
            $user = $this->users->get($r->userId());
            $client = ['name' => trim($user->firstname() . ' ' . $user->lastname()), 'email' => $user->email(), 'phone' => $user->phone()];
        } catch (NotFound) {
            $client = ['name' => '', 'email' => '', 'phone' => ''];
        }
        try {
            $prestation = $this->prestations->get($r->prestationId())->name();
        } catch (NotFound) {
            $prestation = '';
        }

        return [
            'id' => $r->id(),
            'status' => $r->status()->value,
            'start' => $r->period()->start->setTimezone($utc)->format(DATE_ATOM),
            'end' => $r->period()->end->setTimezone($utc)->format(DATE_ATOM),
            'prestationId' => $r->prestationId(),
            'prestation' => $prestation,
            'variante' => $r->variante(),
            'optionIds' => $r->optionIds(),
            'quantite' => $r->quantite(),
            'clientId' => $r->userId(),
            'client' => $client,
            'remiseFideliteCents' => $r->remiseFidelite()->cents,
            'address' => $r->address(),
            'lat' => $r->lat(),
            'lng' => $r->lng(),
            'totalCents' => $r->total()->cents,
            'depositCents' => $r->deposit()->cents,
            'produits' => $r->produits(),
            'produitsCents' => $r->totalProduits()->cents,
            'travelFeeCents' => $r->travelFee()->cents,
            'notes' => $r->notes(),
            'metierData' => $r->metierData(),
        ];
    }
}
