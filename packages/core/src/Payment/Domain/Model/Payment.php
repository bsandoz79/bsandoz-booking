<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Paiement en ligne d'une réservation, via une session de paiement du prestataire (Stripe Checkout) : acompte ou
 * réservation payée d'avance, ou reste à régler sur place payé par le client en scannant le QR code du pro ($surPlace).
 */
class Payment
{
    private PaymentStatus $status = PaymentStatus::Pending;
    private Money $refunded;
    private ?\DateTimeImmutable $paidAt = null;

    public function __construct(
        private string $id,
        private string $reservationId,
        private string $providerSessionId,
        private Money $amount,
        private \DateTimeImmutable $createdAt,
        private bool $surPlace = false,
    ) {
        $this->refunded = Money::zero();
    }

    public function id(): string { return $this->id; }
    public function reservationId(): string { return $this->reservationId; }
    public function providerSessionId(): string { return $this->providerSessionId; }
    public function amount(): Money { return $this->amount; }
    public function refunded(): Money { return $this->refunded; }
    public function status(): PaymentStatus { return $this->status; }
    public function paidAt(): ?\DateTimeImmutable { return $this->paidAt; }
    public function createdAt(): \DateTimeImmutable { return $this->createdAt; }
    /** Reste à régler sur place, payé par QR code (et non acompte / paiement à la réservation). */
    public function surPlace(): bool { return $this->surPlace; }

    public function isPaid(): bool
    {
        return $this->status !== PaymentStatus::Pending;
    }

    /** @return bool faux si le paiement était déjà enregistré (notification reçue deux fois) */
    public function markPaid(\DateTimeImmutable $now): bool
    {
        if ($this->isPaid()) {
            return false;
        }
        $this->status = PaymentStatus::Paid;
        $this->paidAt = $now;

        return true;
    }

    /** Montant encore remboursable. */
    public function refundable(): Money
    {
        return $this->isPaid() ? Money::cents($this->amount->cents - $this->refunded->cents) : Money::zero();
    }

    /** @throws DomainError paiement non encaissé ou montant supérieur au reste remboursable */
    public function refund(Money $amount): void
    {
        if (!$this->isPaid()) {
            throw new DomainError('Ce paiement n\'a pas été encaissé.');
        }
        if ($amount->cents <= 0 || $amount->cents > $this->refundable()->cents) {
            throw new DomainError(sprintf('Le remboursement doit être compris entre 0,01 € et %s.', $this->refundable()->format()));
        }

        $this->refunded = $this->refunded->add($amount);
        $this->status = $this->refunded->equals($this->amount) ? PaymentStatus::Refunded : PaymentStatus::PartiallyRefunded;
    }
}
