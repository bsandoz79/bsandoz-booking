<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Http;

use Bsandoz\Core\Booking\Application\ReserverCreneauCommand;
use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Symfony\Component\HttpFoundation\Request;

/**
 * Corps de POST /api/v1/booking/reservations :
 * {"prestationId", "optionIds": [], "metierData": {}, "variante"?, "start": "2026-11-10T08:00:00+00:00",
 *  "address": {"label", "lat", "lng"} | null, "firstname", "lastname", "email", "phone", "notes"?, "acceptedTerms": true}
 */
final class ReservationRequest
{
    public static function toCommand(Request $request): ReserverCreneauCommand
    {
        try {
            $body = json_decode($request->getContent(), true, 16, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new InvalidRequest('Le corps de la requête doit être un objet JSON.');
        }
        if (!is_array($body) || ($body !== [] && array_is_list($body))) {
            throw new InvalidRequest('Le corps de la requête doit être un objet JSON.');
        }

        $optionIds = $body['optionIds'] ?? [];
        if (!is_array($optionIds) || !array_is_list($optionIds) || array_filter($optionIds, static fn (mixed $id): bool => !is_string($id)) !== []) {
            throw new InvalidRequest('« optionIds » doit être une liste d\'identifiants.');
        }
        $metierData = $body['metierData'] ?? [];
        if (!is_array($metierData) || ($metierData !== [] && array_is_list($metierData))) {
            throw new InvalidRequest('« metierData » doit être un objet.');
        }
        $variante = $body['variante'] ?? null;
        if ($variante !== null && !is_string($variante)) {
            throw new InvalidRequest('« variante » doit être une chaîne.');
        }

        [$label, $lat, $lng] = self::address($body['address'] ?? null);

        /** @var list<string> $optionIds */
        /** @var array<string, mixed> $metierData */
        return new ReserverCreneauCommand(
            self::string($body, 'prestationId'),
            $optionIds,
            $metierData,
            self::start($body['start'] ?? null),
            $label,
            $lat,
            $lng,
            self::string($body, 'email'),
            self::string($body, 'firstname'),
            self::string($body, 'lastname'),
            self::string($body, 'phone'),
            self::string($body, 'notes', required: false),
            ($body['acceptedTerms'] ?? false) === true,
            $variante,
        );
    }

    /** @param array<mixed> $body */
    private static function string(array $body, string $key, bool $required = true): string
    {
        $value = $body[$key] ?? '';
        if (!is_string($value) || ($required && trim($value) === '')) {
            throw new InvalidRequest(sprintf('« %s » est obligatoire.', $key));
        }

        return $value;
    }

    private static function start(mixed $value): \DateTimeImmutable
    {
        if (!is_string($value)) {
            throw new InvalidRequest('« start » est obligatoire (date ISO 8601 avec fuseau).');
        }
        $start = \DateTimeImmutable::createFromFormat(DATE_ATOM, $value);
        if ($start === false) {
            throw new InvalidRequest('« start » doit être une date ISO 8601 avec fuseau, ex. 2026-11-10T08:00:00+00:00.');
        }

        return $start;
    }

    /** @return array{string, float|null, float|null} libellé, lat, lng */
    private static function address(mixed $address): array
    {
        if ($address === null) {
            return ['', null, null];
        }
        if (!is_array($address)) {
            throw new InvalidRequest('« address » doit être un objet {label, lat, lng}.');
        }
        $label = $address['label'] ?? '';
        $lat = $address['lat'] ?? null;
        $lng = $address['lng'] ?? null;
        if (!is_string($label) || (!is_int($lat) && !is_float($lat)) || (!is_int($lng) && !is_float($lng)) || abs((float) $lat) > 90 || abs((float) $lng) > 180) {
            throw new InvalidRequest('« address » doit contenir un libellé et des coordonnées valides.');
        }

        return [$label, (float) $lat, (float) $lng];
    }
}
