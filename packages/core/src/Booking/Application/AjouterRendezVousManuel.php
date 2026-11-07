<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

/**
 * Rendez-vous pris par téléphone par le pro, avec envoi optionnel d'un lien d'acompte.
 *
 * @todo Injecter les ports nécessaires (ReservationRepository, AvailabilityRepository, SettingsProvider, Geocoder, CreneauCalculator, ZoneCalculator, Clock…) et implémenter.
 */
final class AjouterRendezVousManuel
{
    public function __invoke(ReserverCreneauCommand $command, bool $sendDepositLink): string
    {
        throw new \LogicException('À implémenter');
    }
}
