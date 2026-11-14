<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Application;

use Bsandoz\Core\Booking\Application\ListerCreneaux;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Catalog\Application\CalculerDevis;
use Bsandoz\Core\Catalog\Application\StockProduits;
use Bsandoz\Core\Fidelite\Application\GererFidelite;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\Conflit;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Payer plus tard une réservation dont l'acompte n'a pas été réglé (espace client ou lien de gestion) :
 *  - encore bloquée : nouvelle session de paiement ;
 *  - blocage dépassé : sous verrou d'agenda, le créneau doit toujours être libre (sinon Conflit : le client choisit un
 *    autre créneau, puis paie) ; il est de nouveau bloqué le temps du paiement, produits et remise de fidélité repris.
 */
final class ReprendrePaiement
{
    public function __construct(
        private ReservationRepository $reservations,
        private ListerCreneaux $creneaux,
        private CalculerDevis $calculerDevis,
        private SettingsProvider $settings,
        private CreerSessionAcompte $sessionAcompte,
        private Clock $clock,
        private ?GererFidelite $fidelite = null,
        private ?StockProduits $stock = null,
        private ?GererAvoirs $avoirs = null,
    ) {
    }

    /**
     * @param string|null $actorUserId client connecté (null : lien de gestion, déjà vérifié)
     * @return string URL de paiement
     * @throws NotFound réservation inconnue ou d'un autre client
     * @throws Conflit créneau repris entre-temps : en choisir un autre
     * @throws DomainError déjà payée ou annulée, rendez-vous passé, produit épuisé, paiement indisponible
     */
    public function __invoke(string $reservationId, ?string $actorUserId): string
    {
        $reservation = $this->reservations->get($reservationId);
        if ($actorUserId !== null && $reservation->userId() !== $actorUserId) {
            throw new NotFound('Réservation introuvable.');
        }
        if (!$reservation->estImpayee()) {
            throw new DomainError('Cette réservation est déjà réglée ou annulée.');
        }

        if (!$reservation->blocks($this->clock->now())) {
            $this->reservations->dansVerrouAgenda(function () use ($reservation): void {
                $this->verifierCreneauLibre($reservation);
                if ($reservation->status() === ReservationStatus::Expired) {
                    $this->reprendreProduitsEtRemise($reservation);
                }
                $reservation->rebloquer($this->clock->now(), $this->settings->rules()->holdMinutes);
                $this->reservations->save($reservation);
            });
        }

        return ($this->sessionAcompte)($reservation->id());
    }

    /** @throws Conflit */
    private function verifierCreneauLibre(Reservation $r): void
    {
        $aDomicile = $this->settings->zone() !== null;
        $lat = $aDomicile ? $r->lat() : null;
        $lng = $aDomicile ? $r->lng() : null;
        $duree = ($this->calculerDevis)($r->prestationId(), $r->optionIds(), $r->metierData(), $lat, $lng, $r->variante(), $r->quantite(), $r->composantes())->durationMin;
        $date = $r->period()->start->setTimezone($this->settings->timezone())->format('Y-m-d');
        foreach (($this->creneaux)($date, $duree, $lat, $lng, $r->prestationId(), $r->id()) as $slot) {
            if ($slot->start->getTimestamp() === $r->period()->start->getTimestamp()) {
                return;
            }
        }

        throw new Conflit('Ce créneau n\'est plus disponible : choisissez-en un autre, puis réglez l\'acompte.');
    }

    /** Expirée : les produits et la remise de fidélité avaient été rendus ; ils sont repris (produit épuisé : erreur). */
    private function reprendreProduitsEtRemise(Reservation $r): void
    {
        if ($r->produits() !== []) {
            $quantites = [];
            foreach ($r->produits() as $p) {
                $quantites[$p['id']] = $p['quantite'];
            }
            if ($this->stock === null) {
                throw new DomainError('La vente de produits n\'est pas disponible.');
            }
            $this->stock->retirer($quantites);
        }
        if ($r->remiseFidelite()->cents > 0) {
            $this->fidelite?->reprendreRemise($r->userId());
        }
        $this->avoirs?->utiliser($r->userId(), $r->avoirUtilise());
    }
}
