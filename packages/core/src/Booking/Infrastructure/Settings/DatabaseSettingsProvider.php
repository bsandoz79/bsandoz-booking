<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Settings;

use Bsandoz\Core\Admin\Application\Reglages;
use Bsandoz\Core\Admin\Domain\Model\Setting;
use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\Zone;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;

/**
 * Règles et zone réglées par le pro (table setting), avec repli sur la configuration de l'application.
 * Zone enregistrée avec « surPlace: true » : activité sur place (pas de zone), même si la configuration en prévoit une.
 */
final class DatabaseSettingsProvider implements SettingsProvider
{
    public function __construct(
        private SettingRepository $settings,
        private ConfiguredSettingsProvider $defaut,
    ) {
    }

    public function rules(): BookingRules
    {
        $regles = $this->settings->get(Setting::REGLES);

        return $regles === null ? $this->defaut->rules() : Reglages::regles($regles);
    }

    public function zone(): ?Zone
    {
        $zone = $this->settings->get(Setting::ZONE);
        if ($zone === null) {
            return $this->defaut->zone();
        }

        // Zone enregistrée avant le réglage du rayon de la ville : celui de la configuration s'applique.
        $zone += ['rayonVilleKm' => $this->defaut->zone()->rayonVilleKm ?? 0.0];

        return ($zone['surPlace'] ?? false) === true ? null : Reglages::zone($zone);
    }

    public function timezone(): \DateTimeZone
    {
        return $this->defaut->timezone();
    }
}
