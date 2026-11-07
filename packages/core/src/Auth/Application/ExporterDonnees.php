<?php

declare(strict_types=1);

namespace Bsandoz\Core\Auth\Application;

use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;

/** RGPD : export de toutes les données du client (compte et réservations), à télécharger depuis l'espace client. */
final class ExporterDonnees
{
    public function __construct(
        private UserRepository $users,
        private ReservationRepository $reservations,
    ) {
    }

    /** @return array{compte: array<string, mixed>, reservations: list<array<string, mixed>>} */
    public function __invoke(string $userId): array
    {
        $user = $this->users->get($userId);
        $utc = new \DateTimeZone('UTC');

        $reservations = [];
        foreach ($this->reservations->forUser($userId) as $r) {
            $reservations[] = [
                'id' => $r->id(),
                'statut' => $r->status()->value,
                'prestationId' => $r->prestationId(),
                'variante' => $r->variante(),
                'optionIds' => $r->optionIds(),
                'debut' => $r->period()->start->setTimezone($utc)->format(DATE_ATOM),
                'fin' => $r->period()->end->setTimezone($utc)->format(DATE_ATOM),
                'adresse' => $r->address(),
                'totalCentimes' => $r->total()->cents,
                'acompteCentimes' => $r->deposit()->cents,
                'fraisDeplacementCentimes' => $r->travelFee()->cents,
                'notes' => $r->notes(),
                'donneesMetier' => $r->metierData(),
            ];
        }

        return [
            'compte' => [
                'id' => $user->id(),
                'email' => $user->email(),
                'prenom' => $user->firstname(),
                'nom' => $user->lastname(),
                'telephone' => $user->phone(),
                'statut' => $user->status()->value,
                'creeLe' => $user->createdAt()?->setTimezone($utc)->format(DATE_ATOM),
            ],
            'reservations' => $reservations,
        ];
    }
}
