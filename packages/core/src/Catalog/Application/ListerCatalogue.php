<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Application;

use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;

/** Renvoie le catalogue public (prestations actives, tarifs, options). */
final class ListerCatalogue
{
    public function __construct(private PrestationRepository $prestations)
    {
    }

    /**
     * @return list<array<string, mixed>>
     * @todo Mapper chaque Prestation vers un tableau (id, nom, description, prix et durée par variante, options).
     */
    public function __invoke(): array
    {
        throw new \LogicException('À implémenter');
    }
}
