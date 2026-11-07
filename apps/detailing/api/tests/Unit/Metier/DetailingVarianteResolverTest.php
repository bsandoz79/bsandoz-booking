<?php

declare(strict_types=1);

namespace App\Tests\Unit\Metier;

use App\Metier\Detailing\Domain\DetailingVarianteResolver;
use App\Metier\Detailing\Domain\VehicleModelCatalog;
use PHPUnit\Framework\TestCase;

final class DetailingVarianteResolverTest extends TestCase
{
    private DetailingVarianteResolver $resolver;

    protected function setUp(): void
    {
        $this->resolver = new DetailingVarianteResolver(VehicleModelCatalog::fromJsonFile(__DIR__ . '/../../../data/vehicle_models.json'));
    }

    public function testLeTypeChoisiEstPrioritaire(): void
    {
        self::assertSame('utilitaire', $this->resolver->resolve(['vehicleType' => 'utilitaire', 'brand' => 'Peugeot', 'model' => '208']));
    }

    public function testDeduitLeTypeDuModele(): void
    {
        self::assertSame('suv', $this->resolver->resolve(['brand' => 'peugeot', 'model' => '3008']));
        self::assertSame('citadine', $this->resolver->resolve(['brand' => 'Citroen', 'model' => 'C3']));
    }

    public function testModeleInconnu(): void
    {
        self::assertNull($this->resolver->resolve(['brand' => 'Inconnue', 'model' => 'X']));
    }

    public function testCanape(): void
    {
        self::assertSame('canape_3', $this->resolver->resolve(['category' => 'canape', 'seats' => 3]));
        self::assertSame('canape_4', $this->resolver->resolve(['category' => 'canape', 'seats' => 7]));
    }
}
