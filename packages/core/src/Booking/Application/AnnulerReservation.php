<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

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

        $refundable = $reservation->cancel($this->clock->now(), $this->settings->rules());
        $this->reservations->save($reservation);
        if ($reservation->remiseFidelite()->cents > 0) {
            $this->fidelite?->rendreRemise($reservation->userId());
        }
        $this->stock?->remettre($reservation->produits());

        if ($refundable) {
            ($this->rembourser)($reservation->id());
        }
        $this->notifications->annulee($reservation, $refundable);

        return $refundable;
    }
}
