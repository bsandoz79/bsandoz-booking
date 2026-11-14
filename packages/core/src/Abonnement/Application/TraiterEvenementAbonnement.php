<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Application;

use Bsandoz\Core\Abonnement\Domain\Model\Abonnement;
use Bsandoz\Core\Abonnement\Domain\Model\PaiementAbonnement;
use Bsandoz\Core\Abonnement\Domain\Port\Abonnements;
use Bsandoz\Core\Abonnement\Domain\Port\PaiementsAbonnement;
use Bsandoz\Core\Payment\Domain\Model\EvenementPaiement;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Notifications d'abonnement du prestataire (signature déjà vérifiée), traitées sans doublon :
 *  - souscription réglée : abonnement actif dès maintenant (la période exacte arrive avec le prélèvement) ;
 *  - prélèvement payé : période payée prolongée, paiement noté pour la comptabilité (une fois par facture) ;
 *  - prélèvement refusé : abonnement impayé (plus de réservation tant que le prestataire n'a pas encaissé) ;
 *  - souscription terminée (résiliation arrivée à échéance, ou impayés abandonnés) : abonnement terminé.
 * Les notifications d'un abonnement inconnu sont ignorées.
 */
final class TraiterEvenementAbonnement
{
    public function __construct(
        private Abonnements $abonnements,
        private PaiementsAbonnement $paiements,
        private IdGenerator $ids,
        private Clock $clock,
    ) {
    }

    public function __invoke(EvenementPaiement $e): void
    {
        $abonnement = $this->retrouver($e);
        if ($abonnement === null) {
            return;
        }
        $now = $this->clock->now();
        $date = static fn (?int $t): ?\DateTimeImmutable => $t === null ? null : (new \DateTimeImmutable('@' . $t))->setTimezone(new \DateTimeZone('UTC'));

        switch ($e->type) {
            case EvenementPaiement::SESSION_TERMINEE:
                if ($e->souscriptionId !== null) {
                    $abonnement->activer($e->souscriptionId, $now, $abonnement->periodicite()->debutPeriode($now, 1));
                }
                break;
            case EvenementPaiement::PRELEVEMENT_PAYE:
                $debut = $date($e->debutPeriode) ?? $now;
                $fin = $date($e->finPeriode) ?? $abonnement->periodicite()->debutPeriode($debut, 1);
                if ($e->souscriptionId !== null) {
                    $abonnement->activer($e->souscriptionId, $debut, $fin);
                }
                $abonnement->renouveler($fin);
                if ($e->factureId !== null && !$this->paiements->existe($e->factureId)) {
                    $this->paiements->save(new PaiementAbonnement($this->ids->generate(), $abonnement->id(), $e->factureId, Money::cents(max(0, $e->montantCents ?? 0)), $now));
                }
                break;
            case EvenementPaiement::PRELEVEMENT_REFUSE:
                $abonnement->marquerImpaye();
                break;
            case EvenementPaiement::ABONNEMENT_TERMINE:
                $abonnement->terminer($now);
                break;
        }
        $this->abonnements->save($abonnement);
    }

    /** Par notre identifiant (métadonnées), sinon par la session, sinon par la souscription chez le prestataire. */
    private function retrouver(EvenementPaiement $e): ?Abonnement
    {
        if ($e->abonnementId !== null) {
            try {
                return $this->abonnements->get($e->abonnementId);
            } catch (NotFound) {
            }
        }
        if ($e->type === EvenementPaiement::SESSION_TERMINEE && $e->sessionId !== null) {
            $parSession = $this->abonnements->parSession($e->sessionId);
            if ($parSession !== null) {
                return $parSession;
            }
        }

        return $e->souscriptionId !== null ? $this->abonnements->parFournisseur($e->souscriptionId) : null;
    }
}
