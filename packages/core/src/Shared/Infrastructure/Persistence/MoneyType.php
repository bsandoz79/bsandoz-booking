<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure\Persistence;

use Bsandoz\Core\Shared\Domain\Money;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\ConversionException;
use Doctrine\DBAL\Types\Type;

/** Type Doctrine « bsandoz_money » : Money ↔ entier (centimes). */
final class MoneyType extends Type
{
    public const NAME = 'bsandoz_money';

    public function getSQLDeclaration(array $column, AbstractPlatform $platform): string
    {
        return $platform->getIntegerTypeDeclarationSQL($column);
    }

    public function convertToDatabaseValue(mixed $value, AbstractPlatform $platform): ?int
    {
        return match (true) {
            $value === null => null,
            $value instanceof Money => $value->cents,
            default => throw new ConversionException(sprintf('Money attendu, %s reçu.', get_debug_type($value))),
        };
    }

    public function convertToPHPValue(mixed $value, AbstractPlatform $platform): ?Money
    {
        return $value === null ? null : Money::cents((int) $value);
    }
}
