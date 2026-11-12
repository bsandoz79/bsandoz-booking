<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Application;

use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Payment\Domain\Model\Payment;
use Bsandoz\Core\Payment\Domain\Port\PaymentGateway;
use Bsandoz\Core\Payment\Domain\Port\PaymentRepository;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;

/**
 * Session de paiement de l'acompte d'une réservation en attente, produits ajoutés compris (Stripe Checkout : carte, Apple Pay, Google Pay).
 * Renvoie l'URL de paiement. Les URL de retour acceptent le marqueur {reservationId}.
 */
final class CreerSessionAcompte
{
    public function __construct(
        private ReservationRepository $reservations,
        private UserRepository $users,
        private PrestationRepository $prestations,
        private PaymentGateway $gateway,
        private PaymentRepository $payments,
        private IdGenerator $ids,
        private Clock $clock,
        private string $successUrl,
        private string $cancelUrl,
    ) {
    }

    /** @throws DomainError réservation non payable (délai dépassé, rien à payer) ou paiement indisponible */
    public function __invoke(string $reservationId): string
    {
        $reservation = $this->reservations->get($reservationId);
        $now = $this->clock->now();
        if ($reservation->status() !== ReservationStatus::PendingPayment || !$reservation->blocks($now)) {
            throw new DomainError('Le délai de paiement est dépassé, merci de refaire votre réservation.');
        }
        $montant = $reservation->aPayerEnLigne();
        if ($montant->cents === 0) {
            throw new DomainError('Aucun acompte n\'est demandé pour cette réservation.');
        }
        $prestation = $this->prestations->get($reservation->prestationId())->name();
        $libelle = sprintf($reservation->deposit()->cents > 0 ? 'Acompte : %s' : 'Réservation : %s', $prestation);
        if ($reservation->produits() !== []) {
            $libelle .= ' + ' . implode(', ', array_map(
                static fn (array $p): string => $p['quantite'] > 1 ? sprintf('%d × %s', $p['quantite'], $p['nom']) : $p['nom'],
                $reservation->produits(),
            ));
        }

        $checkout = $this->gateway->createCheckout(
            $reservation->id(),
            $montant,
            mb_substr($libelle, 0, 250),
            $this->users->get($reservation->userId())->email(),
            str_replace('{reservationId}', $reservation->id(), $this->successUrl),
            str_replace('{reservationId}', $reservation->id(), $this->cancelUrl),
        );
        $this->payments->save(new Payment($this->ids->generate(), $reservation->id(), $checkout['sessionId'], $montant, $now));

        return $checkout['url'];
    }
}
