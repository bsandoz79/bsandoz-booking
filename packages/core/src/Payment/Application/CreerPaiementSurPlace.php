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
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Paiement sur place par QR code : session de paiement (Stripe Checkout : carte, Apple Pay, Google Pay) pour le reste à
 * régler, que le pro affiche en QR code et que le client paie sur son propre téléphone. Une fois payé (webhook), le
 * rendez-vous est encaissé (moyen « qr ») et la facture émise. Renvoie l'URL de paiement, à mettre dans le QR code.
 */
final class CreerPaiementSurPlace
{
    public function __construct(
        private ReservationRepository $reservations,
        private UserRepository $users,
        private PrestationRepository $prestations,
        private PaymentGateway $gateway,
        private PaymentRepository $payments,
        private IdGenerator $ids,
        private Clock $clock,
        private string $frontUrl = '',
    ) {
    }

    /** @throws NotFound|DomainError rendez-vous pas encore commencé, déjà encaissé, rien à régler, ou paiement indisponible */
    public function __invoke(string $reservationId): string
    {
        $r = $this->reservations->get($reservationId);
        $now = $this->clock->now();
        if (!in_array($r->status(), [ReservationStatus::Confirmed, ReservationStatus::Done], true) || $r->period()->start > $now) {
            throw new DomainError('Le paiement sur place se fait une fois le rendez-vous commencé.');
        }
        if ($r->moyenSurPlace() !== null) {
            throw new DomainError('Ce rendez-vous est déjà encaissé.');
        }
        $montant = $r->resteSurPlace();
        if ($montant->cents <= 0) {
            throw new DomainError('Il ne reste rien à régler pour ce rendez-vous.');
        }
        try {
            $libelle = $this->prestations->get($r->prestationId())->name();
        } catch (NotFound) {
            $libelle = 'Prestation';
        }
        try {
            $email = $this->users->get($r->userId())->email();
        } catch (NotFound) {
            $email = '';
        }
        $retour = rtrim($this->frontUrl, '/') . '/paiement-recu';

        $checkout = $this->gateway->createCheckout($r->id(), $montant, mb_substr($libelle, 0, 250), $email, $retour, $retour . '?annule=1');
        $this->payments->save(new Payment($this->ids->generate(), $r->id(), $checkout['sessionId'], $montant, $now, surPlace: true));

        return $checkout['url'];
    }
}
