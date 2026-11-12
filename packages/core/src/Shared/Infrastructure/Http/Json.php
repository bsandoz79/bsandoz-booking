<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure\Http;

use Symfony\Component\HttpFoundation\Request;

/** Lecture des requêtes de l'API : corps JSON objet et dates en paramètre. */
final class Json
{
    /**
     * @return array<string, mixed>
     * @throws InvalidRequest corps absent ou qui n'est pas un objet JSON
     */
    public static function corps(Request $request): array
    {
        try {
            $body = json_decode($request->getContent() !== '' ? $request->getContent() : '{}', true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new InvalidRequest('Le corps de la requête doit être un objet JSON.');
        }
        if (!is_array($body) || ($body !== [] && array_is_list($body))) {
            throw new InvalidRequest('Le corps de la requête doit être un objet JSON.');
        }

        /** @var array<string, mixed> $body */
        return $body;
    }

    /**
     * Date ISO 8601 (« 2026-11-10T08:00:00+00:00 ») ou jour (« 2026-11-10 », minuit dans le fuseau du pro).
     *
     * @throws InvalidRequest
     */
    public static function date(mixed $value, string $nom, \DateTimeZone $tz): \DateTimeImmutable
    {
        if (is_string($value)) {
            $date = \DateTimeImmutable::createFromFormat(DATE_ATOM, $value);
            if ($date !== false) {
                return $date;
            }
            $jour = \DateTimeImmutable::createFromFormat('!Y-m-d', $value, $tz);
            if ($jour !== false && $jour->format('Y-m-d') === $value) {
                return $jour;
            }
        }

        throw new InvalidRequest(sprintf('« %s » doit être une date (AAAA-MM-JJ ou ISO 8601 avec fuseau).', $nom));
    }
}
