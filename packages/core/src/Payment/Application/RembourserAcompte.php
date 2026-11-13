<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Application;

use Bsandoz\Core\Payment\Domain\Port\PaymentGateway;
use Bsandoz\Core\Payment\Domain\Port\PaymentRepository;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Remboursement de l'acompte encaissé d'une réservation : total par défaut (annulation gratuite), ou partiel (espace pro).
 * Sans paiement encaissé (pas d'acompte, jamais payé, déjà remboursé) : rien n'est fait.
 */
final class RembourserAcompte
{
    public function __construct(
        private PaymentRepository $payments,
        private PaymentGateway $gateway,
    ) {
    }

    /** Somme encaissée et pas encore remboursée pour cette réservation (zéro si rien n'a été payé). */
    public function encaisse(string $reservationId): Money
    {
        return $this->payments->paidForReservation($reservationId)?->refundable() ?? Money::zero();
    }

    /**
     * @return Money montant remboursé
     * @throws DomainError montant supérieur au reste remboursable, ou refus du prestataire
     */
    public function __invoke(string $reservationId, ?int $amountCents = null): Money
    {
        $payment = $this->payments->paidForReservation($reservationId);
        if ($payment === null || $payment->refundable()->cents === 0) {
            return Money::zero();
        }

        $amount = $amountCents === null ? $payment->refundable() : Money::cents($amountCents);
        $payment->refund($amount);
        $this->gateway->refund($payment->providerSessionId(), $amount);
        $this->payments->save($payment);

        return $amount;
    }
}
