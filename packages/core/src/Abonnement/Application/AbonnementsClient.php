<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Application;

use Bsandoz\Core\Abonnement\Domain\Model\Abonnement;
use Bsandoz\Core\Abonnement\Domain\Model\FormuleAbonnement;
use Bsandoz\Core\Abonnement\Domain\Model\StatutAbonnement;
use Bsandoz\Core\Abonnement\Domain\Port\Abonnements;
use Bsandoz\Core\Abonnement\Domain\Port\FormulesAbonnement;
use Bsandoz\Core\Abonnement\Domain\Port\PrestataireAbonnement;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Abonnements côté client (« Mon espace ») : offres proposées, mes abonnements (période en cours, prestation déjà
 * réservée ou non, prochain prélèvement), souscription (paiement de la première période chez le prestataire) et
 * résiliation (effet à la fin de la période payée, sans engagement).
 *
 * @phpstan-type OffreVue array{id: string, nom: string, description: string, prestationId: string, prestation: string, periodicite: string, periodiciteLibelle: string, prixCents: int, prixPrestationCents: int}
 */
final class AbonnementsClient
{
    public function __construct(
        private FormulesAbonnement $formules,
        private Abonnements $abonnements,
        private PrestationRepository $prestations,
        private UserRepository $users,
        private ReservationRepository $reservations,
        private PrestataireAbonnement $prestataire,
        private IdGenerator $ids,
        private Clock $clock,
        private string $frontUrl = '',
    ) {
    }

    /** @return list<OffreVue> offres proposées aux clients */
    public function offres(): array
    {
        $offres = [];
        foreach ($this->formules->toutes() as $f) {
            if ($f->estActive()) {
                try {
                    $offres[] = $this->offre($f);
                } catch (NotFound) {
                    // Prestation retirée du catalogue : l'offre n'est plus proposée.
                }
            }
        }

        return $offres;
    }

    /** @return list<array<string, mixed>> abonnements du client (en cours d'abord), sans ceux jamais payés */
    public function mesAbonnements(string $userId): array
    {
        $now = $this->clock->now();
        $vues = [];
        foreach ($this->abonnements->duClient($userId) as $a) {
            if ($a->statut() === StatutAbonnement::EnAttente) {
                continue;
            }
            try {
                $offre = $this->offre($this->formules->get($a->formuleId()));
            } catch (NotFound) {
                continue;
            }
            $periode = $a->periodeDe($now);
            $prevue = null;
            if ($periode !== null) {
                foreach ($this->reservations->forUser($userId) as $r) {
                    if ($r->abonnementId() === $a->id() && !in_array($r->status(), [ReservationStatus::Cancelled, ReservationStatus::Expired], true)
                        && $r->period()->start >= $periode->start && $r->period()->start < $periode->end) {
                        $prevue = $r->period()->start;
                    }
                }
            }
            $vues[] = [
                'id' => $a->id(),
                'statut' => $a->statut()->value,
                'offre' => $offre,
                'debut' => self::date($a->debut()),
                'finPeriode' => self::date($a->finPeriode()),
                'resiliationDemandee' => $a->resiliationDemandee(),
                'periodeDebut' => self::date($periode?->start),
                'periodeFin' => self::date($periode?->end),
                // Prestation de la période en cours déjà réservée (date), ou null : encore disponible (perdue si non utilisée).
                'prestationPrevueLe' => self::date($prevue),
                'utilisable' => $a->couvre($now),
            ];
        }

        return $vues;
    }

    /**
     * Souscription : renvoie l'adresse de paiement de la première période (carte enregistrée pour les suivantes).
     *
     * @throws NotFound|DomainError offre retirée, abonnement déjà en cours, paiement indisponible
     */
    public function souscrire(string $userId, string $formuleId): string
    {
        $formule = $this->formules->get($formuleId);
        if (!$formule->estActive()) {
            throw new DomainError('Cet abonnement n\'est plus proposé.');
        }
        foreach ($this->abonnements->duClient($userId) as $a) {
            if (in_array($a->statut(), [StatutAbonnement::Actif, StatutAbonnement::Impaye], true)) {
                throw new DomainError('Vous avez déjà un abonnement en cours : résiliez-le avant d\'en prendre un autre.');
            }
        }
        $user = $this->users->get($userId);
        $abonnement = new Abonnement($this->ids->generate(), $userId, $formule->id(), $formule->periodicite(), $this->clock->now());
        $retour = rtrim($this->frontUrl, '/') . '/mon-espace?abonnement=';
        $session = $this->prestataire->creerSouscription(
            $abonnement->id(),
            sprintf('Abonnement %s', $formule->nom()),
            $formule->prix(),
            $formule->periodicite(),
            $user->email(),
            $retour . 'ok',
            $retour . 'annule',
        );
        $abonnement->lierSession($session['sessionId']);
        $this->abonnements->save($abonnement);

        return $session['url'];
    }

    /** @throws NotFound|DomainError abonnement d'un autre client ou déjà terminé */
    public function resilier(string $userId, string $abonnementId): void
    {
        $abonnement = $this->abonnements->get($abonnementId);
        if ($abonnement->userId() !== $userId) {
            throw new NotFound('Abonnement introuvable.');
        }
        if ($abonnement->resiliationDemandee()) {
            return;
        }
        $abonnement->demanderResiliation();
        if ($abonnement->fournisseurId() !== null) {
            $this->prestataire->resilierEnFinDePeriode($abonnement->fournisseurId());
        }
        $this->abonnements->save($abonnement);
    }

    /**
     * @return OffreVue
     * @throws NotFound prestation comprise retirée du catalogue
     */
    private function offre(FormuleAbonnement $f): array
    {
        $prestation = $this->prestations->get($f->prestationId());

        return [
            'id' => $f->id(), 'nom' => $f->nom(), 'description' => $f->description(),
            'prestationId' => $f->prestationId(), 'prestation' => $prestation->name(),
            'periodicite' => $f->periodicite()->value, 'periodiciteLibelle' => $f->periodicite()->libelle(),
            'prixCents' => $f->prix()->cents, 'prixPrestationCents' => $prestation->basePrice()->cents,
        ];
    }

    private static function date(?\DateTimeImmutable $d): ?string
    {
        return $d?->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM);
    }
}
