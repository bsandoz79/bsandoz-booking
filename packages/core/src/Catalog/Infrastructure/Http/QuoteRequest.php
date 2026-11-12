<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Infrastructure\Http;

use Bsandoz\Core\Shared\Infrastructure\Http\InvalidRequest;
use Symfony\Component\HttpFoundation\Request;

/**
 * Corps de POST /api/v1/booking/quote :
 * {"prestationId": "…", "optionIds": ["…"], "metierData": {…}, "variante": "…", "lat": 49.89, "lng": 2.29, "quantite": 1}
 * Seul prestationId est obligatoire ; lat et lng vont ensemble.
 */
final class QuoteRequest
{
    /**
     * @param list<string> $optionIds
     * @param array<string, mixed> $metierData
     */
    private function __construct(
        public readonly string $prestationId,
        public readonly array $optionIds,
        public readonly array $metierData,
        public readonly ?string $variante,
        public readonly ?float $lat,
        public readonly ?float $lng,
        public readonly int $quantite = 1,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        try {
            $body = json_decode($request->getContent(), true, 16, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new InvalidRequest('Le corps de la requête doit être un objet JSON.');
        }
        if (!is_array($body) || ($body !== [] && array_is_list($body))) {
            throw new InvalidRequest('Le corps de la requête doit être un objet JSON.');
        }

        $prestationId = $body['prestationId'] ?? null;
        if (!is_string($prestationId) || trim($prestationId) === '') {
            throw new InvalidRequest('« prestationId » est obligatoire.');
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

        $lat = self::coordinate($body, 'lat', 90.0);
        $lng = self::coordinate($body, 'lng', 180.0);
        if (($lat === null) !== ($lng === null)) {
            throw new InvalidRequest('« lat » et « lng » vont ensemble.');
        }

        /** @var list<string> $optionIds */
        /** @var array<string, mixed> $metierData */
        return new self($prestationId, $optionIds, $metierData, $variante, $lat, $lng, self::quantite($body));
    }

    /** @param array<mixed> $body */
    public static function quantite(array $body): int
    {
        $quantite = $body['quantite'] ?? 1;
        if (!is_int($quantite)) {
            throw new InvalidRequest('« quantite » doit être un nombre entier.');
        }

        return $quantite;
    }

    /** @param array<mixed> $body */
    private static function coordinate(array $body, string $key, float $max): ?float
    {
        $value = $body[$key] ?? null;
        if ($value === null) {
            return null;
        }
        if (!is_int($value) && !is_float($value) || abs((float) $value) > $max) {
            throw new InvalidRequest(sprintf('« %s » doit être un nombre entre -%d et %d.', $key, $max, $max));
        }

        return (float) $value;
    }
}
