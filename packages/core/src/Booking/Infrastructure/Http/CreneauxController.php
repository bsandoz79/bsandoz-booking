<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Bsandoz\Core\Booking\Application\ListerCreneaux;
use Bsandoz\Core\Booking\Application\ListerJoursDisponibles;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Calendrier public :
 *   GET /api/v1/booking/days?month=AAAA-MM&duration=150&lat=…&lng=…&prestation=…  → ["2026-11-10", …]
 *   GET /api/v1/booking/slots?date=AAAA-MM-JJ&duration=150&lat=…&lng=…&prestation=… → [{"start", "end", "label", "groupe"}, …]
 *   (groupe : créneau proche d'un rendez-vous déjà prévu, à mettre en avant)
 * lat/lng : obligatoires pour une activité à domicile ; prestation : facultative (durée incertaine → demi-journées).
 */
#[Route('/api/v1/booking')]
final class CreneauxController
{
    public function __construct(
        private ListerJoursDisponibles $jours,
        private ListerCreneaux $creneaux,
        private SettingsProvider $settings,
    ) {
    }

    #[Route('/days', name: 'bsandoz_booking_days', methods: ['GET'])]
    public function days(Request $request): JsonResponse
    {
        [$duration, $lat, $lng, $prestation] = self::common($request);

        return new JsonResponse(($this->jours)(self::required($request, 'month'), $duration, $lat, $lng, $prestation));
    }

    #[Route('/slots', name: 'bsandoz_booking_slots', methods: ['GET'])]
    public function slots(Request $request): JsonResponse
    {
        [$duration, $lat, $lng, $prestation] = self::common($request);
        $tz = $this->settings->timezone();

        return new JsonResponse(array_map(static fn (array $s): array => [
            'start' => $s['creneau']->start->format(DATE_ATOM),
            'end' => $s['creneau']->end->format(DATE_ATOM),
            'label' => $s['creneau']->start->setTimezone($tz)->format('H:i'),
            'groupe' => $s['groupe'],
        ], $this->creneaux->avecRegroupement(self::required($request, 'date'), $duration, $lat, $lng, $prestation)));
    }

    /** @return array{int, float|null, float|null, string|null} durée, lat, lng, prestation */
    private static function common(Request $request): array
    {
        $duration = filter_var($request->query->get('duration'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 1440]]);
        if ($duration === false) {
            throw new InvalidRequest('« duration » doit être un nombre de minutes entre 1 et 1440.');
        }

        $lat = self::coordinate($request, 'lat', 90);
        $lng = self::coordinate($request, 'lng', 180);
        if (($lat === null) !== ($lng === null)) {
            throw new InvalidRequest('« lat » et « lng » vont ensemble.');
        }

        $prestation = $request->query->get('prestation');
        $prestation = is_string($prestation) && $prestation !== '' ? $prestation : null;

        return [$duration, $lat, $lng, $prestation];
    }

    private static function required(Request $request, string $key): string
    {
        $value = $request->query->get($key);
        if (!is_string($value) || $value === '') {
            throw new InvalidRequest(sprintf('« %s » est obligatoire.', $key));
        }

        return $value;
    }

    private static function coordinate(Request $request, string $key, int $max): ?float
    {
        $raw = $request->query->get($key);
        if ($raw === null || $raw === '') {
            return null;
        }
        $value = filter_var($raw, FILTER_VALIDATE_FLOAT);
        if ($value === false || abs($value) > $max) {
            throw new InvalidRequest(sprintf('« %s » doit être un nombre entre -%d et %d.', $key, $max, $max));
        }

        return $value;
    }
}
