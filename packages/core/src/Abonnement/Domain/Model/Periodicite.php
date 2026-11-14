<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Domain\Model;

/** Rythme d'un abonnement : un lavage (une prestation) par période, prélevé à chaque période. */
enum Periodicite: string
{
    case Semaine = 'semaine';
    case Quinzaine = 'quinzaine';
    case Mois = 'mois';
    case Annee = 'annee';

    public function libelle(): string
    {
        return match ($this) {
            self::Semaine => 'chaque semaine',
            self::Quinzaine => 'tous les 15 jours',
            self::Mois => 'chaque mois',
            self::Annee => 'chaque année',
        };
    }

    /** Début de la n-ième période après $debut (calculé depuis le début, sans dérive en fin de mois). */
    public function debutPeriode(\DateTimeImmutable $debut, int $n): \DateTimeImmutable
    {
        return $n === 0 ? $debut : $debut->modify(match ($this) {
            self::Semaine => sprintf('+%d weeks', $n),
            self::Quinzaine => sprintf('+%d weeks', 2 * $n),
            self::Mois => sprintf('+%d months', $n),
            self::Annee => sprintf('+%d years', $n),
        });
    }

    /** @return array{interval: string, interval_count: int} rythme de prélèvement chez le prestataire */
    public function rythme(): array
    {
        return match ($this) {
            self::Semaine => ['interval' => 'week', 'interval_count' => 1],
            self::Quinzaine => ['interval' => 'week', 'interval_count' => 2],
            self::Mois => ['interval' => 'month', 'interval_count' => 1],
            self::Annee => ['interval' => 'year', 'interval_count' => 1],
        };
    }
}
