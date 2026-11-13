<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Payment\Application\RembourserAcompte;
use Bsandoz\Core\Fidelite\Application\GererFidelite;
use Bsandoz\Core\Catalog\Application\StockProduits;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Annulation par le client titulaire, selon les règles d'annulation.
 * Annulation gratuite : l'acompte encaissé est remboursé aussitôt. Renvoie vrai dans ce cas.
 * Annulation tardive d'un rendez-vous confirmé : rien n'est remboursé, la somme payée en ligne devient un avoir du client,
 * déduit de sa prochaine réservation. Dans tous les cas, l'avoir utilisé pour cette réservation est rendu.
 * Le client et le pro sont prévenus par mail.
 */
final class AnnulerReservation
{
    public function __construct(
        private ReservationRepository $reservations,
        private SettingsProvider $settings,
        private RembourserAcompte $rembourser,
        private NotificationsReservation $notifications,
        private Clock $clock,
        private ?GererFidelite $fidelite = null,
        private ?StockProduits $stock = null,
        private ?\Bsandoz\Core\Payment\Application\GererAvoirs $avoirs = null,
    ) {
    }

    /**
     * @throws NotFound réservation inconnue ou d'un autre client
     * @throws DomainError réservation déjà annulée ou passée, ou remboursement refusé par le prestataire
     */
    public function __invoke(string $reservationId, string $actorUserId): bool
    {
        $reservation = $this->reservations->get($reservationId);
        if ($reservation->userId() !== $actorUserId) {
            throw new NotFound('Réservation introuvable.');
        }

        // Réservation expirée : remise de fidélité et produits ont déjà été rendus à l'expiration.
        $dejaRendue = $reservation->status() === ReservationStatus::Expired;
        $etaitConfirmee = $reservation->status() === ReservationStatus::Confirmed;
        $refundable = $reservation->cancel($this->clock->now(), $this->settings->rules());
        $this->reservations->save($reservation);
        if (!$dejaRendue) {
            if ($reservation->remiseFidelite()->cents > 0) {
                $this->fidelite?->rendreRemise($reservation->userId());
            }
            $this->stock?->remettre($reservation->produits());
            $this->avoirs?->crediter($reservation->userId(), $reservation->avoirUtilise());
        }

        $avoirCredite = $reservation->avoirUtilise();
        if ($refundable) {
            ($this->rembourser)($reservation->id());
        } elseif ($etaitConfirmee && $this->avoirs !== null) {
            $encaisse = $this->rembourser->encaisse($reservation->id());
            $this->avoirs->crediter($reservation->userId(), $encaisse);
            $avoirCredite = $avoirCredite->add($encaisse);
        }
        $this->notifications->annulee($reservation, $refundable, $refundable || $this->avoirs === null ? null : $avoirCredite);

        return $refundable;
    }
}
