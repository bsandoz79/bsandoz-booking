<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Application;

use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Notification\Domain\Service\IcsGenerator;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Flux iCal du pro (abonnement depuis Google Agenda, Apple Calendrier…) : rendez-vous confirmés ou faits,
 * des 30 derniers jours à l'année à venir, avec la prestation, le client, son téléphone et l'adresse.
 */
final class FluxAgendaPro
{
    private const PASSE = '-30 days';
    private const FUTUR = '+366 days';

    public function __construct(
        private ReservationRepository $reservations,
        private UserRepository $users,
        private PrestationRepository $prestations,
        private IcsGenerator $ics,
        private Clock $clock,
        private string $brand,
    ) {
    }

    public function __invoke(): string
    {
        $now = $this->clock->now();
        $events = [];
        foreach ($this->reservations->between($now->modify(self::PASSE), $now->modify(self::FUTUR)) as $r) {
            if (!in_array($r->status(), [ReservationStatus::Confirmed, ReservationStatus::Done], true)) {
                continue;
            }
            try {
                $user = $this->users->get($r->userId());
                $client = trim($user->firstname() . ' ' . $user->lastname());
                $phone = $user->phone();
            } catch (NotFound) {
                [$client, $phone] = ['', ''];
            }
            try {
                $prestation = $this->prestations->get($r->prestationId())->name();
            } catch (NotFound) {
                $prestation = 'Rendez-vous';
            }

            $description = array_filter([
                $phone !== '' ? 'Téléphone : ' . $phone : '',
                sprintf('Total : %s', number_format($r->total()->cents / 100, 2, ',', ' ') . ' €'),
                $r->notes() !== '' ? 'Informations : ' . $r->notes() : '',
            ]);
            $events[] = [
                'uid' => $r->id() . '@bsandoz',
                'period' => $r->period(),
                'summary' => $client !== '' ? sprintf('%s – %s', $prestation, $client) : $prestation,
                'location' => $r->address(),
                'description' => implode("\n", $description),
            ];
        }

        return $this->ics->feed($this->brand, $events, $now);
    }
}
