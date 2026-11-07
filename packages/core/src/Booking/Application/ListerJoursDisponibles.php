<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Booking\Domain\Port\AvailabilityRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Booking\Domain\Service\CreneauCalculator;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;

/** Jours du mois avec au moins un créneau, pour une durée et une adresse (même règles que ListerCreneaux). */
final class ListerJoursDisponibles
{
    public function __construct(
        private AvailabilityRepository $availability,
        private SettingsProvider $settings,
        private PrestationRepository $prestations,
        private CreneauCalculator $calculator,
        private Occupations $occupations,
        private Trajet $trajet,
        private Clock $clock,
    ) {
    }

    /**
     * @param string $month mois au format Y-m
     * @return list<string> dates Y-m-d
     * @throws DomainError mois invalide, adresse manquante ou hors zone
     */
    public function __invoke(string $month, int $durationMin, ?float $lat, ?float $lng, ?string $prestationId = null): array
    {
        if (preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $month, $m) !== 1) {
            throw new DomainError('Mois invalide (format attendu AAAA-MM).');
        }

        $tz = $this->settings->timezone();
        $first = new \DateTimeImmutable($month . '-01 00:00', $tz);
        $occupePlage = $prestationId !== null && $this->prestations->get($prestationId)->occupePlage();
        $travel = ($this->trajet)($lat, $lng);
        $busy = ($this->occupations)($first, $first->modify('+1 month'));

        return $this->calculator->joursDisponibles(
            (int) $m[1], (int) $m[2], $durationMin, $travel, $this->availability->openingHours(), $busy,
            $this->settings->rules(), $this->clock->now(), $tz, $occupePlage,
        );
    }
}
