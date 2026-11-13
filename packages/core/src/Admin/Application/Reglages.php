<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Application;

use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\PalierDeplacement;
use Bsandoz\Core\Booking\Domain\Model\Zone;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Conversion des réglages du pro entre tableaux (JSON de l'API et de la table setting) et objets du domaine,
 * qui en vérifient la cohérence.
 */
final class Reglages
{
    /**
     * @param array<string, mixed> $r
     * @throws DomainError valeur manquante ou incohérente
     */
    public static function regles(array $r): BookingRules
    {
        return new BookingRules(
            minNoticeHours: self::int($r, 'minNoticeHours'),
            horizonDays: self::int($r, 'horizonDays'),
            bufferMin: self::int($r, 'bufferMin'),
            slotStepMin: self::int($r, 'slotStepMin'),
            freeCancelHours: self::int($r, 'freeCancelHours'),
            depositPercent: self::intOuNull($r, 'depositPercent'),
            depositFixedCents: self::intOuNull($r, 'depositFixedCents'),
            holdMinutes: self::int($r, 'holdMinutes'),
        );
    }

    /** @return array<string, int|null> */
    public static function reglesEnTableau(BookingRules $r): array
    {
        return [
            'minNoticeHours' => $r->minNoticeHours,
            'horizonDays' => $r->horizonDays,
            'bufferMin' => $r->bufferMin,
            'slotStepMin' => $r->slotStepMin,
            'freeCancelHours' => $r->freeCancelHours,
            'depositPercent' => $r->depositPercent,
            'depositFixedCents' => $r->depositFixedCents,
            'holdMinutes' => $r->holdMinutes,
        ];
    }

    /**
     * @param array<string, mixed> $z
     * @throws DomainError valeur manquante ou incohérente
     */
    public static function zone(array $z): Zone
    {
        return new Zone(
            originLat: self::float($z, 'originLat'),
            originLng: self::float($z, 'originLng'),
            freeRadiusKm: self::float($z, 'freeRadiusKm'),
            pricePerKm: Money::cents(self::int($z, 'pricePerKmCents')),
            maxDistanceKm: self::float($z, 'maxDistanceKm'),
            roadFactor: self::float($z, 'roadFactor', 1.3),
            averageSpeedKmh: self::float($z, 'averageSpeedKmh', 50.0),
            paliers: self::paliers($z['paliers'] ?? []),
            rayonVilleKm: self::float($z, 'rayonVilleKm', 0.0),
        );
    }

    /**
     * Tranches au format {jusquaKm, prixCents}, triées par distance.
     *
     * @return list<PalierDeplacement>
     */
    public static function paliers(mixed $paliers): array
    {
        if (!is_array($paliers) || !array_is_list($paliers)) {
            throw new DomainError('« paliers » doit être une liste de tranches {jusquaKm, prixCents}.');
        }
        $liste = [];
        foreach ($paliers as $p) {
            if (!is_array($p)) {
                throw new DomainError('Chaque tranche doit être un objet {jusquaKm, prixCents}.');
            }
            /** @var array<string, mixed> $p */
            $liste[] = new PalierDeplacement(self::float($p, 'jusquaKm'), Money::cents(self::int($p, 'prixCents')));
        }
        usort($liste, static fn (PalierDeplacement $a, PalierDeplacement $b): int => $a->jusquaKm <=> $b->jusquaKm);

        return $liste;
    }

    /** @return array<string, mixed> */
    public static function zoneEnTableau(Zone $z): array
    {
        return [
            'originLat' => $z->originLat,
            'originLng' => $z->originLng,
            'freeRadiusKm' => $z->freeRadiusKm,
            'pricePerKmCents' => $z->pricePerKm->cents,
            'maxDistanceKm' => $z->maxDistanceKm,
            'roadFactor' => $z->roadFactor,
            'averageSpeedKmh' => $z->averageSpeedKmh,
            'rayonVilleKm' => $z->rayonVilleKm,
            'paliers' => array_map(static fn (PalierDeplacement $p): array => ['jusquaKm' => $p->jusquaKm, 'prixCents' => $p->prix->cents], $z->paliers),
        ];
    }

    /** @param array<string, mixed> $a */
    private static function int(array $a, string $key): int
    {
        $value = $a[$key] ?? null;

        return is_int($value) || (is_string($value) && ctype_digit($value)) ? (int) $value
            : throw new DomainError(sprintf('« %s » doit être un nombre entier.', $key));
    }

    /** @param array<string, mixed> $a */
    private static function intOuNull(array $a, string $key): ?int
    {
        return ($a[$key] ?? null) === null ? null : self::int($a, $key);
    }

    /** @param array<string, mixed> $a */
    private static function float(array $a, string $key, ?float $defaut = null): float
    {
        $value = $a[$key] ?? $defaut;

        return is_int($value) || is_float($value) ? (float) $value : throw new DomainError(sprintf('« %s » doit être un nombre.', $key));
    }
}
