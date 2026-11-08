<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Application;

use Bsandoz\Core\Admin\Domain\Model\Setting;
use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Réglages de l'espace pro : règles de réservation (délais, horizon, tampon, pas, annulation, acompte, blocage)
 * et zone d'intervention (ou activité sur place). Chaque modification est validée par le domaine.
 */
final class GererReglages
{
    public function __construct(
        private SettingsProvider $settings,
        private SettingRepository $repository,
    ) {
    }

    /** @return array{rules: array<string, int|null>, zone: array<string, float|int>|null, timezone: string} */
    public function lire(): array
    {
        $zone = $this->settings->zone();

        return [
            'rules' => Reglages::reglesEnTableau($this->settings->rules()),
            'zone' => $zone === null ? null : Reglages::zoneEnTableau($zone),
            'timezone' => $this->settings->timezone()->getName(),
        ];
    }

    /**
     * @param array<string, mixed> $regles
     * @throws DomainError
     */
    public function modifierRegles(array $regles): void
    {
        $this->repository->save(Setting::REGLES, Reglages::reglesEnTableau(Reglages::regles($regles)));
    }

    /**
     * @param array<string, mixed>|null $zone null : activité sur place (ni trajet ni frais)
     * @throws DomainError
     */
    public function modifierZone(?array $zone): void
    {
        $this->repository->save(Setting::ZONE, $zone === null ? ['surPlace' => true] : Reglages::zoneEnTableau(Reglages::zone($zone)));
    }
}
