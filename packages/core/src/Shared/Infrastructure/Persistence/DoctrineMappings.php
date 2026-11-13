<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure\Persistence;

use Bsandoz\Core\Catalog\Infrastructure\Persistence\TarifsType;

/**
 * Mappings XML et types Doctrine du kit, en un seul endroit :
 * utilisé par le bundle (configuration de DoctrineBundle) et par les tests d'intégration.
 */
final class DoctrineMappings
{
    /** @return array<string, array{dir: string, prefix: string}> mappings par module */
    public static function mappings(): array
    {
        $src = \dirname(__DIR__, 3);

        return [
            'BsandozShared' => ['dir' => $src . '/Shared/Infrastructure/Persistence/Mapping', 'prefix' => 'Bsandoz\Core\Shared\Domain'],
            'BsandozCatalog' => ['dir' => $src . '/Catalog/Infrastructure/Persistence/Mapping', 'prefix' => 'Bsandoz\Core\Catalog\Domain\Model'],
            'BsandozAuth' => ['dir' => $src . '/Auth/Infrastructure/Persistence/Mapping', 'prefix' => 'Bsandoz\Core\Auth\Domain\Model'],
            'BsandozPayment' => ['dir' => $src . '/Payment/Infrastructure/Persistence/Mapping', 'prefix' => 'Bsandoz\Core\Payment\Domain\Model'],
            'BsandozNotification' => ['dir' => $src . '/Notification/Infrastructure/Persistence/Mapping', 'prefix' => 'Bsandoz\Core\Notification\Domain\Model'],
            'BsandozAdmin' => ['dir' => $src . '/Admin/Infrastructure/Persistence/Mapping', 'prefix' => 'Bsandoz\Core\Admin\Domain\Model'],
            'BsandozBooking' => ['dir' => $src . '/Booking/Infrastructure/Persistence/Mapping', 'prefix' => 'Bsandoz\Core\Booking\Domain\Model'],
            'BsandozFidelite' => ['dir' => $src . '/Fidelite/Infrastructure/Persistence/Mapping', 'prefix' => 'Bsandoz\Core\Fidelite\Domain\Model'],
            'BsandozComptabilite' => ['dir' => $src . '/Comptabilite/Infrastructure/Persistence/Mapping', 'prefix' => 'Bsandoz\Core\Comptabilite\Domain\Model'],
            'BsandozFacturation' => ['dir' => $src . '/Facturation/Infrastructure/Persistence/Mapping', 'prefix' => 'Bsandoz\Core\Facturation\Domain\Model'],
        ];
    }

    /** @return array<string, class-string<\Doctrine\DBAL\Types\Type>> */
    public static function types(): array
    {
        return [
            MoneyType::NAME => MoneyType::class,
            ChiffreType::NAME => ChiffreType::class,
            TarifsType::NAME => TarifsType::class,
        ];
    }
}
