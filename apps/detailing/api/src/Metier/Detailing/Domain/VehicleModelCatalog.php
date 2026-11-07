<?php

declare(strict_types=1);

namespace App\Metier\Detailing\Domain;

/**
 * Associe une marque et un modèle à un type de véhicule (proposé au client, modifiable).
 * Données de départ dans data/vehicle_models.json ; plus tard en base (table vehicle_model).
 */
final class VehicleModelCatalog
{
    /** @var array<string, VehicleType> clé « marque|modèle » normalisée */
    private array $index = [];

    /** @param list<array{brand: string, model: string, type: string}> $models */
    public function __construct(array $models)
    {
        foreach ($models as $m) {
            $this->index[$this->key($m['brand'], $m['model'])] = VehicleType::from($m['type']);
        }
    }

    public static function fromJsonFile(string $path): self
    {
        /** @var list<array{brand: string, model: string, type: string}> $models */
        $models = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);

        return new self($models);
    }

    public function typeOf(string $brand, string $model): ?VehicleType
    {
        return $this->index[$this->key($brand, $model)] ?? null;
    }

    private function key(string $brand, string $model): string
    {
        $normalize = static fn (string $s): string => preg_replace('/[^a-z0-9]/', '', strtolower(iconv('UTF-8', 'ASCII//TRANSLIT', $s) ?: $s)) ?? '';

        return $normalize($brand) . '|' . $normalize($model);
    }
}
