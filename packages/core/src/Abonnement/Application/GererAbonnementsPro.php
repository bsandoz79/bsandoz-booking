<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Application;

use Bsandoz\Core\Abonnement\Domain\Model\FormuleAbonnement;
use Bsandoz\Core\Abonnement\Domain\Model\Periodicite;
use Bsandoz\Core\Abonnement\Domain\Model\StatutAbonnement;
use Bsandoz\Core\Abonnement\Domain\Port\Abonnements;
use Bsandoz\Core\Abonnement\Domain\Port\FormulesAbonnement;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Abonnements dans l'espace pro : offres (prestation comprise, rythme, prix ; jamais supprimées, on les retire) et
 * abonnés (client, offre, statut, prochain prélèvement).
 *
 * Offre : {"nom", "prestationId", "periodicite": "semaine" | "quinzaine" | "mois" | "annee", "prixCents", "description"?, "active"?, "position"?}
 */
final class GererAbonnementsPro
{
    public function __construct(
        private FormulesAbonnement $formules,
        private Abonnements $abonnements,
        private PrestationRepository $prestations,
        private UserRepository $users,
        private IdGenerator $ids,
    ) {
    }

    /** @return list<array<string, mixed>> toutes les offres, retirées comprises */
    public function offres(): array
    {
        return array_map($this->vue(...), $this->formules->toutes());
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     * @throws NotFound|DomainError
     */
    public function enregistrer(array $data, ?string $id = null): array
    {
        $nom = $data['nom'] ?? '';
        $prestationId = $data['prestationId'] ?? '';
        $periodicite = is_string($data['periodicite'] ?? null) ? Periodicite::tryFrom($data['periodicite']) : null;
        $prix = $data['prixCents'] ?? null;
        if (!is_string($nom) || !is_string($prestationId) || $periodicite === null || !is_int($prix)) {
            throw new DomainError('Abonnement : « nom », « prestationId », « periodicite » (semaine, quinzaine, mois, annee) et « prixCents » sont obligatoires.');
        }
        $this->prestations->get($prestationId);
        $description = is_string($data['description'] ?? null) ? $data['description'] : '';
        $active = ($data['active'] ?? true) === true;
        $position = is_int($data['position'] ?? null) ? $data['position'] : count($this->formules->toutes());

        if ($id === null) {
            $formule = new FormuleAbonnement($this->ids->generate(), $nom, $prestationId, $periodicite, Money::cents(max(0, $prix)), $description, $active, $position);
        } else {
            $formule = $this->formules->get($id);
            $formule->modifier($nom, $prestationId, $periodicite, Money::cents(max(0, $prix)), $description, $active, $position);
        }
        $this->formules->save($formule);

        return $this->vue($formule);
    }

    /** @return list<array<string, mixed>> abonnés (sans les souscriptions jamais payées) */
    public function abonnes(): array
    {
        $vues = [];
        foreach ($this->abonnements->tous() as $a) {
            if ($a->statut() === StatutAbonnement::EnAttente) {
                continue;
            }
            try {
                $user = $this->users->get($a->userId());
                $client = ['nom' => trim($user->firstname() . ' ' . $user->lastname()), 'email' => $user->email(), 'telephone' => $user->phone()];
            } catch (NotFound) {
                $client = ['nom' => '', 'email' => '', 'telephone' => ''];
            }
            try {
                $offre = $this->formules->get($a->formuleId())->nom();
            } catch (NotFound) {
                $offre = '';
            }
            $vues[] = [
                'id' => $a->id(), 'client' => $client, 'offre' => $offre, 'statut' => $a->statut()->value,
                'debut' => $a->debut()?->format(DATE_ATOM), 'finPeriode' => $a->finPeriode()?->format(DATE_ATOM),
                'resiliationDemandee' => $a->resiliationDemandee(),
            ];
        }

        return $vues;
    }

    /** @return array<string, mixed> */
    private function vue(FormuleAbonnement $f): array
    {
        try {
            $prestation = $this->prestations->get($f->prestationId())->name();
        } catch (NotFound) {
            $prestation = '';
        }

        return [
            'id' => $f->id(), 'nom' => $f->nom(), 'description' => $f->description(), 'prestationId' => $f->prestationId(), 'prestation' => $prestation,
            'periodicite' => $f->periodicite()->value, 'periodiciteLibelle' => $f->periodicite()->libelle(), 'prixCents' => $f->prix()->cents,
            'active' => $f->estActive(), 'position' => $f->position(),
        ];
    }
}
