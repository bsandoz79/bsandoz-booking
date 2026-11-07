<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure\Persistence;

use Bsandoz\Core\Shared\Infrastructure\Security\Chiffreur;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\ConversionException;
use Doctrine\DBAL\Types\Type;

/**
 * Type Doctrine « bsandoz_chiffre » : texte chiffré en base, en clair dans le domaine.
 * Les types Doctrine étant partagés, le chiffreur est fourni au démarrage (BsandozCoreBundle::boot, tests d'intégration).
 */
final class ChiffreType extends Type
{
    public const NAME = 'bsandoz_chiffre';

    private static ?Chiffreur $chiffreur = null;

    public static function utiliser(Chiffreur $chiffreur): void
    {
        self::$chiffreur = $chiffreur;
    }

    public function getSQLDeclaration(array $column, AbstractPlatform $platform): string
    {
        return $platform->getClobTypeDeclarationSQL($column);
    }

    public function convertToDatabaseValue(mixed $value, AbstractPlatform $platform): ?string
    {
        return match (true) {
            $value === null => null,
            is_string($value) => self::chiffreur()->chiffrer($value),
            default => throw new ConversionException(sprintf('Texte attendu, %s reçu.', get_debug_type($value))),
        };
    }

    public function convertToPHPValue(mixed $value, AbstractPlatform $platform): ?string
    {
        return $value === null ? null : self::chiffreur()->dechiffrer((string) $value);
    }

    private static function chiffreur(): Chiffreur
    {
        return self::$chiffreur ?? throw new \LogicException('Chiffreur non initialisé (BsandozCoreBundle non démarré ?).');
    }
}
