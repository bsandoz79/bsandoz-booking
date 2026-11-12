<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Booking\Application\NotificationsReservation;
use Bsandoz\Core\Booking\Application\Occupations;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Payment\Domain\Port\PaymentGateway;
use Bsandoz\Core\Payment\Domain\Port\PaymentRepository;
use Bsandoz\Core\Payment\Domain\SignatureInvalide;
use Bsandoz\Core\Fidelite\Application\GererFidelite;
use Bsandoz\Core\Catalog\Application\StockProduits;
use Bsandoz\Core\Shared\Domain\Clock;

/**
 * Notification « session de paiement réglée » (webhook) : signature vérifiée, traitement idempotent, sous verrou d'agenda.
 *  - créneau toujours libre (y compris paiement arrivé après la fin du blocage) : réservation confirmée,
 *    mails de confirmation au client (avec .ics et lien « gérer mon rendez-vous ») et au pro ;
 *  - créneau repris entre-temps ou réservation annulée : acompte remboursé en totalité, mail « payment_refunded ».
 * Les autres notifications, et les sessions inconnues, sont ignorées.
 */
final class ConfirmerPaiement
{
    public function __construct(
        private PaymentGateway $gateway,
        private PaymentRepository $payments,
        private ReservationRepository $reservations,
        private Occupations $occupations,
        private TokenService $tokens,
        private NotificationsReservation $notifications,
        private Clock $clock,
        private ?GererFidelite $fidelite = null,
        private ?StockProduits $stock = null,
    ) {
    }

    /** @throws SignatureInvalide */
    public function __invoke(string $payload, string $signature): void
    {
        $evenement = $this->gateway->parseWebhook($payload, $signature);
        if (!$evenement->confirmeUnPaiement() || $evenement->sessionId === null) {
            return;
        }
        $payment = $this->payments->bySessionId($evenement->sessionId);
        if ($payment === null) {
            return;
        }

        $this->reservations->dansVerrouAgenda(function () use ($payment): void {
            $now = $this->clock->now();
            if (!$payment->markPaid($now)) {
                return;
            }
            $reservation = $this->reservations->get($payment->reservationId());

            if ($this->peutEtreConfirmee($reservation, $now)) {
                // Paiement arrivé après l'expiration : la remise de fidélité rendue à l'expiration est reprise.
                if ($reservation->status() === ReservationStatus::Expired && $reservation->remiseFidelite()->cents > 0) {
                    $this->fidelite?->reprendreRemise($reservation->userId());
                }
                // Idem pour les produits remis en stock à l'expiration : ils sont payés, ils sont repris.
                if ($reservation->status() === ReservationStatus::Expired) {
                    $this->stock?->reprendre($reservation->produits());
                }
                $reservation->confirm();
                $this->reservations->save($reservation);
                $this->payments->save($payment);

                $validite = max(3600, $reservation->period()->end->getTimestamp() - $now->getTimestamp());
                $lien = $this->tokens->issue($reservation->id(), TokenType::ManageReservation, new \DateInterval(sprintf('PT%dS', $validite)), replacePrevious: false);
                $this->notifications->confirmee($reservation, $lien);

                return;
            }

            $montant = $payment->refundable();
            $payment->refund($montant);
            $this->gateway->refund($payment->providerSessionId(), $montant);
            $this->payments->save($payment);
            $this->notifications->remboursee($reservation, $montant, 'creneau_indisponible');
        });
    }

    /** En attente ou expirée, et aucun autre rendez-vous / congé ne prend le créneau entre-temps. */
    private function peutEtreConfirmee(Reservation $reservation, \DateTimeImmutable $now): bool
    {
        if (!in_array($reservation->status(), [ReservationStatus::PendingPayment, ReservationStatus::Expired], true)) {
            return false;
        }
        $period = $reservation->period();
        foreach (($this->occupations)($period->start, $period->end, $reservation->id()) as $busy) {
            if ($busy->overlaps($period)) {
                return false;
            }
        }

        return $period->start > $now;
    }
}
