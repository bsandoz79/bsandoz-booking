<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Application;

use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Application\Occupations;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Notification\Domain\Port\Notifier;
use Bsandoz\Core\Payment\Domain\Port\PaymentGateway;
use Bsandoz\Core\Payment\Domain\Port\PaymentRepository;
use Bsandoz\Core\Payment\Domain\SignatureInvalide;
use Bsandoz\Core\Shared\Domain\Clock;

/**
 * Notification « session de paiement réglée » (webhook) : signature vérifiée, traitement idempotent, sous verrou d'agenda.
 *  - créneau toujours libre (y compris paiement arrivé après la fin du blocage) : réservation confirmée,
 *    mail « booking_confirmed » avec un lien « gérer mon rendez-vous » ;
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
        private UserRepository $users,
        private TokenService $tokens,
        private Notifier $notifier,
        private Clock $clock,
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
            $user = $this->users->get($reservation->userId());

            if ($this->peutEtreConfirmee($reservation, $now)) {
                $reservation->confirm();
                $this->reservations->save($reservation);
                $this->payments->save($payment);

                $validite = max(3600, $reservation->period()->end->getTimestamp() - $now->getTimestamp());
                $lien = $this->tokens->issue($reservation->id(), TokenType::ManageReservation, new \DateInterval(sprintf('PT%dS', $validite)), replacePrevious: false);
                $this->notifier->send($user->email(), 'booking_confirmed', [
                    'firstname' => $user->firstname(),
                    'reservationId' => $reservation->id(),
                    'start' => $reservation->period()->start->format(DATE_ATOM),
                    'depositCents' => $payment->amount()->cents,
                    'manageToken' => $lien,
                ]);

                return;
            }

            $montant = $payment->refundable();
            $payment->refund($montant);
            $this->gateway->refund($payment->providerSessionId(), $montant);
            $this->payments->save($payment);
            $this->notifier->send($user->email(), 'payment_refunded', [
                'firstname' => $user->firstname(),
                'reservationId' => $reservation->id(),
                'amountCents' => $montant->cents,
                'reason' => 'creneau_indisponible',
            ]);
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
