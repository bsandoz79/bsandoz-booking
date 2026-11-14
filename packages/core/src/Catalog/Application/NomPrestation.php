<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Application;

use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Nom affiché d'une prestation réservée : son nom, suivi des prestations choisies pour une formule combinée
 * (ex. « Formule complète (Intérieur Signature + Extérieur Éclat) »).
 */
final class NomPrestation
{
    /**
     * @param list<string> $composantes
     * @throws NotFound prestation inconnue
     */
    public static function de(PrestationRepository $prestations, string $prestationId, array $composantes = []): string
    {
        $nom = $prestations->get($prestationId)->name();
        $choix = [];
        foreach ($composantes as $id) {
            try {
                $choix[] = $prestations->get($id)->name();
            } catch (NotFound) {
            }
        }

        return $choix === [] ? $nom : sprintf('%s (%s)', $nom, implode(' + ', $choix));
    }
}
