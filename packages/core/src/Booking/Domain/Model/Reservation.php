<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;

/** Réservation d'un client. Les données propres au métier sont dans $metierData (JSON). */
class Reservation
{
    private ReservationStatus $status = ReservationStatus::PendingPayment;
    private ?\DateTimeImmutable $holdExpiresAt = null;

    /**
     * @param list<string> $optionIds
     * @param array<string, mixed> $metierData
     */
    public function __construct(
        private string $id,
        private string $userId,
        private string $prestationId,
        private ?string $variante,
        private array $optionIds,
        private TimeRange $period,
        private string $address,
        private float $lat,
        private float $lng,
        private Money $total,
        private Money $deposit,
        private Money $travelFee,
        private array $metierData = [],
        private string $notes = '',
        /** Remise de la carte de fidélité déjà déduite du total (null : aucune). */
        private ?Money $remiseFidelite = null,
        /**
         * Produits ajoutés (prix figé à la réservation), payés en entier en ligne avec l'acompte, hors total de la prestation.
         *
         * @var list<array{id: string, nom: string, prixCents: int, quantite: int}>|null
         */
        private ?array $produits = null,
        /** Nombre d'unités de la prestation (ex. véhicules) ; null : 1 (réservations antérieures). */
        private ?int $quantite = null,
        /**
         * Choix du client : true = tout payer en ligne (prestation et produits), false = sur place (seul l'acompte réglé,
         * s'il y en a un, se paie en ligne) ; null : réservations antérieures (acompte et produits en ligne).
         */
        private ?bool $paiementEnLigne = null,
    ) {
    }

    public static function hold(self $reservation, \DateTimeImmutable $now, int $holdMinutes): self
    {
        $reservation->holdExpiresAt = $now->modify(sprintf('+%d minutes', $holdMinutes));
        return $reservation;
    }

    public function id(): string { return $this->id; }
    public function userId(): string { return $this->userId; }
    public function prestationId(): string { return $this->prestationId; }
    public function variante(): ?string { return $this->variante; }
    /** @return list<string> */
    public function optionIds(): array { return $this->optionIds; }
    public function period(): TimeRange { return $this->period; }
    public function address(): string { return $this->address; }
    public function lat(): float { return $this->lat; }
    public function lng(): float { return $this->lng; }
    public function status(): ReservationStatus { return $this->status; }
    public function total(): Money { return $this->total; }
    public function deposit(): Money { return $this->deposit; }
    public function travelFee(): Money { return $this->travelFee; }
    /** @return array<string, mixed> */
    public function metierData(): array { return $this->metierData; }
    public function notes(): string { return $this->notes; }
    public function remiseFidelite(): Money { return $this->remiseFidelite ?? Money::zero(); }
    public function quantite(): int { return $this->quantite ?? 1; }
    /** @return list<array{id: string, nom: string, prixCents: int, quantite: int}> */
    public function produits(): array { return $this->produits ?? []; }

    /** Total des produits ajoutés (payés en ligne, en plus de l'acompte). */
    public function totalProduits(): Money
    {
        $total = Money::zero();
        foreach ($this->produits() as $p) {
            $total = $total->add(Money::cents($p['prixCents'])->multiply($p['quantite']));
        }

        return $total;
    }

    public function paiementEnLigne(): ?bool { return $this->paiementEnLigne; }

    /** Montant à payer en ligne : tout (prestation et produits), l'acompte seul, ou acompte et produits (ancien mode). */
    public function aPayerEnLigne(): Money
    {
        return match ($this->paiementEnLigne) {
            true => $this->total->add($this->totalProduits()),
            false => $this->deposit,
            null => $this->deposit->add($this->totalProduits()),
        };
    }

    /** Reste à régler sur place, une fois la prestation faite. */
    public function resteSurPlace(): Money
    {
        return $this->total->add($this->totalProduits())->subtract($this->aPayerEnLigne());
    }

    public function blocks(\DateTimeImmutable $now): bool
    {
        if ($this->status === ReservationStatus::PendingPayment) {
            return $this->holdExpiresAt !== null && $this->holdExpiresAt > $now;
        }
        return $this->status->blocksSlot();
    }

    /**
     * Confirme après paiement de l'acompte (ou sans acompte). Une réservation expirée peut encore l'être :
     * le paiement peut arriver après la fin du blocage ; le cas d'usage vérifie alors que le créneau est toujours libre.
     */
    public function confirm(): void
    {
        if (!in_array($this->status, [ReservationStatus::PendingPayment, ReservationStatus::Expired], true)) {
            throw new DomainError('Seule une réservation en attente de paiement peut être confirmée.');
        }
        $this->status = ReservationStatus::Confirmed;
        $this->holdExpiresAt = null;
    }

    /**
     * Annule une réservation à venir (en attente de paiement ou confirmée).
     *
     * @return bool vrai si l'acompte versé est remboursable : réservation confirmée annulée au moins
     *              freeCancelHours avant le rendez-vous (en attente de paiement : rien n'a été versé)
     * @throws DomainError déjà annulée / terminée, ou rendez-vous passé
     */
    public function cancel(\DateTimeImmutable $now, BookingRules $rules): bool
    {
        if (!in_array($this->status, [ReservationStatus::PendingPayment, ReservationStatus::Expired, ReservationStatus::Confirmed], true)) {
            throw new DomainError('Cette réservation ne peut plus être annulée.');
        }
        if ($this->period->start <= $now) {
            throw new DomainError('Un rendez-vous passé ne peut pas être annulé.');
        }

        $refundable = $this->status === ReservationStatus::Confirmed && $this->isBeforeFreeCancelDeadline($now, $rules);
        $this->status = ReservationStatus::Cancelled;
        $this->holdExpiresAt = null;

        return $refundable;
    }

    /**
     * Déplace une réservation confirmée vers une nouvelle période (la disponibilité est vérifiée par le cas d'usage).
     *
     * @throws DomainError réservation non confirmée, moins de freeCancelHours avant le rendez-vous, ou nouvelle date trop proche
     */
    public function reschedule(TimeRange $newPeriod, \DateTimeImmutable $now, BookingRules $rules): void
    {
        if ($this->status !== ReservationStatus::Confirmed) {
            throw new DomainError('Seule une réservation confirmée peut être déplacée.');
        }
        if (!$this->isBeforeFreeCancelDeadline($now, $rules)) {
            throw new DomainError(sprintf('Un rendez-vous ne peut plus être déplacé moins de %d h avant.', $rules->freeCancelHours));
        }
        if ($newPeriod->start < $now->modify(sprintf('+%d hours', $rules->minNoticeHours))) {
            throw new DomainError('La nouvelle date est trop proche.');
        }

        $this->period = $newPeriod;
    }

    /** Prestation réalisée (espace pro). @throws DomainError réservation non confirmée ou pas encore commencée */
    public function markDone(\DateTimeImmutable $now): void
    {
        $this->terminer($now);
        $this->status = ReservationStatus::Done;
    }

    /** Client absent (espace pro). @throws DomainError réservation non confirmée ou pas encore commencée */
    public function markNoShow(\DateTimeImmutable $now): void
    {
        $this->terminer($now);
        $this->status = ReservationStatus::NoShow;
    }

    /**
     * Annulation par le pro (rendez-vous pris par téléphone, imprévu…) : possible à tout moment avant la fin du rendez-vous ;
     * le remboursement de l'acompte est décidé par le pro, pas par le délai d'annulation gratuite.
     *
     * @throws DomainError déjà annulée, terminée ou passée
     */
    public function cancelByPro(\DateTimeImmutable $now): void
    {
        if (!in_array($this->status, [ReservationStatus::PendingPayment, ReservationStatus::Confirmed], true) || $this->period->end <= $now) {
            throw new DomainError('Cette réservation ne peut plus être annulée.');
        }
        $this->status = ReservationStatus::Cancelled;
        $this->holdExpiresAt = null;
    }

    private function terminer(\DateTimeImmutable $now): void
    {
        if (!in_array($this->status, [ReservationStatus::Confirmed, ReservationStatus::Done, ReservationStatus::NoShow], true)) {
            throw new DomainError('Seule une réservation confirmée peut être marquée comme faite ou absente.');
        }
        if ($this->period->start > $now) {
            throw new DomainError('Le rendez-vous n\'a pas encore commencé.');
        }
    }

    /** Blocage de paiement dépassé : libère le créneau. */
    public function expire(): void
    {
        if ($this->status !== ReservationStatus::PendingPayment) {
            throw new DomainError('Seule une réservation en attente de paiement peut expirer.');
        }
        $this->status = ReservationStatus::Expired;
        $this->holdExpiresAt = null;
    }

    public function holdExpiresAt(): ?\DateTimeImmutable { return $this->holdExpiresAt; }

    /** Acompte jamais payé : en attente de paiement (bloquée ou non) ou expirée. */
    public function estImpayee(): bool
    {
        return in_array($this->status, [ReservationStatus::PendingPayment, ReservationStatus::Expired], true);
    }

    /**
     * Paiement repris plus tard (espace client) : le créneau est de nouveau bloqué le temps du paiement.
     * La disponibilité du créneau est vérifiée par le cas d'usage.
     *
     * @throws DomainError réservation déjà payée ou annulée, ou rendez-vous passé
     */
    public function rebloquer(\DateTimeImmutable $now, int $holdMinutes): void
    {
        if (!$this->estImpayee()) {
            throw new DomainError('Cette réservation est déjà réglée ou annulée.');
        }
        if ($this->period->start <= $now) {
            throw new DomainError('Ce rendez-vous est passé : merci de refaire une réservation.');
        }
        $this->status = ReservationStatus::PendingPayment;
        $this->holdExpiresAt = $now->modify(sprintf('+%d minutes', $holdMinutes));
    }

    /**
     * Autre créneau pour une réservation pas encore payée (aucun délai d'annulation : rien n'a été versé).
     *
     * @throws DomainError réservation payée ou annulée, ou nouvelle date trop proche
     */
    public function changerCreneauImpaye(TimeRange $newPeriod, \DateTimeImmutable $now, BookingRules $rules): void
    {
        if (!$this->estImpayee()) {
            throw new DomainError('Seule une réservation en attente de paiement peut changer de créneau ainsi.');
        }
        if ($newPeriod->start < $now->modify(sprintf('+%d hours', $rules->minNoticeHours))) {
            throw new DomainError('La nouvelle date est trop proche.');
        }
        $this->period = $newPeriod;
    }

    private function isBeforeFreeCancelDeadline(\DateTimeImmutable $now, BookingRules $rules): bool
    {
        return $now <= $this->period->start->modify(sprintf('-%d hours', $rules->freeCancelHours));
    }
}
