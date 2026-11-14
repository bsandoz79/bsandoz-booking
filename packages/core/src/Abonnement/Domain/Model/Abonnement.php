<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\TimeRange;

/**
 * Abonnement d'un client à une formule : une prestation comprise par période (comptée depuis le premier paiement),
 * prélevée automatiquement à chaque période. Une prestation non réservée dans sa période est perdue.
 * Sans engagement : la résiliation prend effet à la fin de la période déjà payée.
 */
class Abonnement
{
    private StatutAbonnement $statut = StatutAbonnement::EnAttente;
    private ?\DateTimeImmutable $debut = null;
    private ?\DateTimeImmutable $finPeriode = null;
    private ?string $fournisseurId = null;
    private ?string $sessionId = null;
    private bool $resiliationDemandee = false;
    private ?\DateTimeImmutable $termineLe = null;

    public function __construct(
        private string $id,
        private string $userId,
        private string $formuleId,
        private Periodicite $periodicite,
        private \DateTimeImmutable $creeLe,
    ) {
    }

    public function id(): string { return $this->id; }
    public function userId(): string { return $this->userId; }
    public function formuleId(): string { return $this->formuleId; }
    public function periodicite(): Periodicite { return $this->periodicite; }
    public function creeLe(): \DateTimeImmutable { return $this->creeLe; }
    public function statut(): StatutAbonnement { return $this->statut; }
    public function debut(): ?\DateTimeImmutable { return $this->debut; }
    /** Fin de la période payée (prochain prélèvement, ou fin de l'abonnement s'il est résilié). */
    public function finPeriode(): ?\DateTimeImmutable { return $this->finPeriode; }
    public function fournisseurId(): ?string { return $this->fournisseurId; }
    public function sessionId(): ?string { return $this->sessionId; }
    public function resiliationDemandee(): bool { return $this->resiliationDemandee; }
    public function termineLe(): ?\DateTimeImmutable { return $this->termineLe; }

    /** Session de paiement de la souscription (premier prélèvement). */
    public function lierSession(string $sessionId): void
    {
        $this->sessionId = $sessionId;
    }

    /** Premier paiement reçu : l'abonnement commence. Sans effet s'il est déjà actif (notification reçue deux fois). */
    public function activer(string $fournisseurId, \DateTimeImmutable $debut, \DateTimeImmutable $finPeriode): void
    {
        if ($this->statut !== StatutAbonnement::EnAttente) {
            return;
        }
        $this->statut = StatutAbonnement::Actif;
        $this->fournisseurId = $fournisseurId;
        $this->debut = $debut;
        $this->finPeriode = $finPeriode;
    }

    /** Prélèvement de la période suivante reçu. */
    public function renouveler(\DateTimeImmutable $finPeriode): void
    {
        if ($this->statut === StatutAbonnement::Termine) {
            return;
        }
        $this->statut = StatutAbonnement::Actif;
        if ($this->finPeriode === null || $finPeriode > $this->finPeriode) {
            $this->finPeriode = $finPeriode;
        }
    }

    public function marquerImpaye(): void
    {
        if ($this->statut === StatutAbonnement::Actif) {
            $this->statut = StatutAbonnement::Impaye;
        }
    }

    /** @throws DomainError abonnement déjà terminé */
    public function demanderResiliation(): void
    {
        if ($this->statut === StatutAbonnement::Termine) {
            throw new DomainError('Cet abonnement est déjà terminé.');
        }
        $this->resiliationDemandee = true;
    }

    public function terminer(\DateTimeImmutable $now): void
    {
        $this->statut = StatutAbonnement::Termine;
        $this->termineLe ??= $now;
    }

    /** Période (début → fin) qui contient cette date, comptée depuis le premier paiement ; null avant le début. */
    public function periodeDe(\DateTimeImmutable $date): ?TimeRange
    {
        if ($this->debut === null || $date < $this->debut) {
            return null;
        }
        for ($n = 0; $n < 2000; ++$n) {
            $fin = $this->periodicite->debutPeriode($this->debut, $n + 1);
            if ($date < $fin) {
                return new TimeRange($this->periodicite->debutPeriode($this->debut, $n), $fin);
            }
        }

        return null;
    }

    /**
     * Une prestation de l'abonnement peut-elle avoir lieu à cette date ? Abonnement actif, date pas avant le début, et
     * pas après la fin de la période payée si la résiliation est demandée (les périodes suivantes seront prélevées).
     */
    public function couvre(\DateTimeImmutable $date): bool
    {
        if ($this->statut !== StatutAbonnement::Actif || $this->periodeDe($date) === null) {
            return false;
        }

        return !$this->resiliationDemandee || ($this->finPeriode !== null && $date < $this->finPeriode);
    }
}
