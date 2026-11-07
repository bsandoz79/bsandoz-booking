<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Port;

/**
 * Point d'extension métier : à partir des données métier envoyées par le front
 * (ex. ['brand' => 'Peugeot', 'model' => '3008']), renvoie la variante de tarif (ex. « suv »).
 * Implémenté par chaque application cliente (ex. DetailingVarianteResolver).
 */
interface VarianteResolver
{
    /** @param array<string, mixed> $metierData */
    public function resolve(array $metierData): ?string;
}
