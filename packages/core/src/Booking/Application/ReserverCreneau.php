<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Auth\Application\CreerCompteDepuisReservation;
use Bsandoz\Core\Auth\Domain\Model\TokenType;
use Bsandoz\Core\Auth\Domain\Port\TokenService;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Catalog\Application\CalculerDevis;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Domain\TimeRange;

/**
 * Crée la réservation, seul sur l'agenda (verrou) :
 *  1. recalcule le devis côté serveur (prix, variante, zone) ;
 *  2. revérifie que le créneau demandé fait toujours partie des créneaux libres ;
 *  3. crée ou retrouve le compte du client ;
 *  4. enregistre la réservation : bloquée holdMinutes en attente de l'acompte, ou confirmée si aucun acompte n'est demandé ;
 *  5. émet le jeton « gérer mon rendez-vous » (voir, annuler, déplacer sans compte), valable jusqu'à la fin du rendez-vous.
 * La session de paiement de l'acompte est créée ensuite (feature/core-payment).
 */
final class ReserverCreneau
{
    private const NOTES_MAX = 2000;

    public function __construct(
        private CalculerDevis $calculerDevis,
        private ListerCreneaux $creneaux,
        private CreerCompteDepuisReservation $creerCompte,
        private ReservationRepository $reservations,
        private SettingsProvider $settings,
        private TokenService $tokens,
        private NotificationsReservation $notifications,
        private IdGenerator $ids,
        private Clock $clock,
    ) {
    }

    /** @throws DomainError CGV non acceptées, adresse manquante ou hors zone, créneau indisponible, données client invalides */
    public function __invoke(ReserverCreneauCommand $c): ReservationCreee
    {
        if (!$c->acceptedTerms) {
            throw new DomainError('Merci d\'accepter les conditions générales de vente.');
        }
        if (mb_strlen($c->notes) > self::NOTES_MAX) {
            throw new DomainError(sprintf('Les informations complémentaires sont limitées à %d caractères.', self::NOTES_MAX));
        }
        $aDomicile = $this->settings->zone() !== null;
        if ($aDomicile && trim($c->address) === '') {
            throw new DomainError('L\'adresse d\'intervention est obligatoire.');
        }

        $devis = ($this->calculerDevis)($c->prestationId, $c->optionIds, $c->metierData, $c->lat, $c->lng, $c->variante);
        if (!$devis->inZone) {
            throw new DomainError('Cette adresse est en dehors de la zone d\'intervention.');
        }

        return $this->reservations->dansVerrouAgenda(function () use ($c, $devis, $aDomicile): ReservationCreee {
            $slot = $this->creneauDisponible($c, $devis->durationMin);
            $userId = ($this->creerCompte)($c->email, $c->firstname, $c->lastname, $c->phone);
            $now = $this->clock->now();

            $reservation = new Reservation(
                $this->ids->generate(),
                $userId,
                $c->prestationId,
                $devis->variante,
                array_values(array_unique($c->optionIds)),
                $slot,
                $aDomicile ? trim($c->address) : '',
                $c->lat ?? 0.0,
                $c->lng ?? 0.0,
                $devis->total,
                $devis->deposit,
                $devis->travelFee,
                $c->metierData,
                trim($c->notes),
            );

            if ($devis->deposit->cents === 0) {
                $reservation->confirm();
            } else {
                Reservation::hold($reservation, $now, $this->settings->rules()->holdMinutes);
            }
            $this->reservations->save($reservation);

            $validite = max(3600, $slot->end->getTimestamp() - $now->getTimestamp());
            $manageToken = $this->tokens->issue($reservation->id(), TokenType::ManageReservation, new \DateInterval(sprintf('PT%dS', $validite)));
            if ($reservation->status() === ReservationStatus::Confirmed) {
                $this->notifications->confirmee($reservation, $manageToken);
            }

            return new ReservationCreee($reservation->id(), $reservation->status(), $reservation->deposit(), $reservation->total(), $reservation->holdExpiresAt(), $manageToken);
        });
    }

    /** Créneau libre qui commence exactement à l'heure demandée (sa fin dépend de la prestation : durée ou fin de demi-journée). */
    private function creneauDisponible(ReserverCreneauCommand $c, int $durationMin): TimeRange
    {
        $date = $c->start->setTimezone($this->settings->timezone())->format('Y-m-d');
        foreach (($this->creneaux)($date, $durationMin, $c->lat, $c->lng, $c->prestationId) as $slot) {
            if ($slot->start->getTimestamp() === $c->start->getTimestamp()) {
                return $slot;
            }
        }

        throw new DomainError('Ce créneau n\'est plus disponible, merci d\'en choisir un autre.');
    }
}
