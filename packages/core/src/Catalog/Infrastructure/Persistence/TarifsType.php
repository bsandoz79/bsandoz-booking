<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Infrastructure\Persistence;

use Bsandoz\Core\Catalog\Domain\Model\Tarif;
use Bsandoz\Core\Shared\Domain\Money;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\ConversionException;
use Doctrine\DBAL\Types\Type;

/**
 * Type Doctrine « bsandoz_tarifs » : tarifs d'une prestation indexés par variante ↔ JSON
 * {"<variante>": {"price_cents": 8900, "duration_min": 120}, …}.
 */
final class TarifsType extends Type
{
    public const NAME = 'bsandoz_tarifs';

    public function getSQLDeclaration(array $column, AbstractPlatform $platform): string
    {
        return $platform->getJsonTypeDeclarationSQL($column);
    }

    public function convertToDatabaseValue(mixed $value, AbstractPlatform $platform): ?string
    {
        if ($value === null) {
            return null;
        }
        if (!is_array($value)) {
            throw new ConversionException(sprintf('Tableau de tarifs attendu, %s reçu.', get_debug_type($value)));
        }

        $data = [];
        foreach ($value as $tarif) {
            if (!$tarif instanceof Tarif) {
                throw new ConversionException(sprintf('Tarif attendu, %s reçu.', get_debug_type($tarif)));
            }
            $data[$tarif->variante] = ['price_cents' => $tarif->price->cents, 'duration_min' => $tarif->durationMin];
        }

        return json_encode((object) $data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }

    /** @return array<string, Tarif>|null */
    public function convertToPHPValue(mixed $value, AbstractPlatform $platform): ?array
    {
        if ($value === null || $value === '') {
            return $value === null ? null : [];
        }

        $data = json_decode(is_resource($value) ? (string) stream_get_contents($value) : (string) $value, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($data)) {
            throw new ConversionException('Tarifs JSON invalides.');
        }

        $tarifs = [];
        foreach ($data as $variante => $row) {
            if (!is_array($row) || !isset($row['price_cents'], $row['duration_min'])) {
                throw new ConversionException(sprintf('Tarif JSON invalide pour la variante « %s ».', $variante));
            }
            $variante = (string) $variante;
            $tarifs[$variante] = new Tarif($variante, Money::cents((int) $row['price_cents']), (int) $row['duration_min']);
        }

        return $tarifs;
    }
}
