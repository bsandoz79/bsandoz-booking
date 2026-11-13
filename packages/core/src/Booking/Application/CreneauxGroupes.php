<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Bsandoz\Core\Shared\Domain\DomainError;

/**
 * Créneaux groupés : un créneau qui commence ou finit à moins de `seuilMin` minutes d'un rendez-vous déjà prévu
 * (trajets compris) est mis en avant, pour enchaîner les rendez-vous et rouler moins. 0 : désactivé.
 */
final class CreneauxGroupes
{
    public const CLE = 'creneaux_groupes';
    public const SEUIL_PAR_DEFAUT = 30;
    public const SEUIL_MAX = 240;

    public function __construct(private ?SettingRepository $settings = null)
    {
    }

    public function seuilMin(): int
    {
        $seuil = $this->settings?->get(self::CLE)['seuilMin'] ?? self::SEUIL_PAR_DEFAUT;

        return is_int($seuil) ? $seuil : self::SEUIL_PAR_DEFAUT;
    }

    /** @throws DomainError hors de 0 à SEUIL_MAX */
    public function changer(mixed $seuilMin): int
    {
        if (!is_int($seuilMin) || $seuilMin < 0 || $seuilMin > self::SEUIL_MAX) {
            throw new DomainError(sprintf('« seuilMin » : nombre de minutes entre 0 et %d.', self::SEUIL_MAX));
        }
        if ($this->settings === null) {
            throw new DomainError('Réglage indisponible.');
        }
        $this->settings->save(self::CLE, ['seuilMin' => $seuilMin]);

        return $seuilMin;
    }
}
