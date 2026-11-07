<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Infrastructure\Variante;

use Bsandoz\Core\Catalog\Domain\Port\VarianteResolver;

/**
 * Résolveur par défaut : aucune variante (tarif de base, ou variante envoyée explicitement).
 * Une application cliente le remplace par son propre résolveur métier dans config/services.yaml.
 */
final class SansVarianteResolver implements VarianteResolver
{
    public function resolve(array $metierData): ?string
    {
        return null;
    }
}
