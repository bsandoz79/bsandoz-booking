<?php

declare(strict_types=1);

namespace Bsandoz\Core\Facturation\Application;

use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Catalog\Application\CalculerDevis;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Facturation\Domain\Model\Facture;
use Bsandoz\Core\Facturation\Domain\Port\FactureRepository;
use Bsandoz\Core\Notification\Domain\Port\Notifier;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Émet la facture d'une prestation réalisée (une seule par réservation : un deuxième appel renvoie la même) :
 *  - lignes : prestation et options (tarif recalculé), déplacement, remise de fidélité, produits ; si le tarif a changé
 *    depuis la réservation, une ligne « Ajustement du tarif » ramène au montant réservé ;
 *  - numéro chronologique sans trou, attribué sous verrou (F-AAAA-NNNN) ;
 *  - vendeur (réglages de facturation) et client (compte, entreprise et SIRET saisis à la réservation) figés ;
 *  - envoyée au client par mail.
 */
final class EmettreFacture
{
    public function __construct(
        private FactureRepository $factures,
        private ReservationRepository $reservations,
        private UserRepository $users,
        private PrestationRepository $prestations,
        private CalculerDevis $calculerDevis,
        private SettingsProvider $settings,
        private InfosFacturation $infos,
        private IdGenerator $ids,
        private Clock $clock,
        private ?Notifier $notifier = null,
        private ?\Bsandoz\Core\Notification\Application\DemandeAvis $avis = null,
    ) {
    }

    /** @throws NotFound|DomainError réservation inconnue ou pas encore réalisée */
    public function __invoke(string $reservationId): Facture
    {
        $existante = $this->factures->pourReservation($reservationId);
        if ($existante !== null) {
            return $existante;
        }
        $r = $this->reservations->get($reservationId);
        if ($r->status() !== ReservationStatus::Done) {
            throw new DomainError('La facture s\'établit une fois la prestation marquée comme faite.');
        }

        $lignes = $this->lignes($r);
        $total = $r->total()->add($r->totalProduits());
        $somme = array_sum(array_column($lignes, 'montantCents'));
        if ($somme !== $total->cents) {
            $lignes[] = ['libelle' => 'Ajustement du tarif', 'montantCents' => $total->cents - $somme];
        }
        $client = $this->client($r);

        $facture = $this->reservations->dansVerrouAgenda(function () use ($r, $lignes, $total, $client): Facture {
            $now = $this->clock->now();
            $annee = (int) $now->setTimezone($this->settings->timezone())->format('Y');
            $facture = new Facture(
                $this->ids->generate(),
                Facture::numeroSuivant($this->factures->dernierNumero($annee), $annee),
                $r->id(),
                $r->userId(),
                $now,
                $r->period()->start,
                $this->infos->vendeur(),
                $client,
                $lignes,
                $total,
                $r->aPayerEnLigne()->min($total),
            );
            $this->factures->save($facture);

            return $facture;
        });

        if ($client['email'] !== '') {
            $this->notifier?->send($client['email'], 'invoice_issued', [
                'firstname' => $client['nom'], 'numero' => $facture->numero(), 'totalCents' => $total->cents, 'factureId' => $facture->id(),
                // Demande d'avis (ex. Google) jointe au mail : la prestation vient d'être faite.
                'avisUrl' => $this->avis?->lien(),
            ]);
        }

        return $facture;
    }

    /** @return list<array{libelle: string, montantCents: int}> */
    private function lignes(Reservation $r): array
    {
        $lignes = [];
        $aDomicile = $this->settings->zone() !== null;
        try {
            $devis = ($this->calculerDevis)($r->prestationId(), $r->optionIds(), $r->metierData(), $aDomicile ? $r->lat() : null, $aDomicile ? $r->lng() : null, $r->variante(), $r->quantite());
            foreach ($devis->lines as $ligne) {
                if ($ligne['label'] !== 'Frais de déplacement') {
                    $lignes[] = ['libelle' => $ligne['label'], 'montantCents' => $ligne['price']->cents];
                }
            }
        } catch (DomainError|NotFound) {
            // Prestation retirée du catalogue depuis : une seule ligne au montant réservé.
            try {
                $nom = $this->prestations->get($r->prestationId())->name();
            } catch (NotFound) {
                $nom = 'Prestation';
            }
            $lignes[] = ['libelle' => $nom, 'montantCents' => $r->total()->subtract($r->travelFee())->add($r->remiseFidelite())->add($r->avoirUtilise())->cents];
        }
        if ($r->travelFee()->cents > 0) {
            $lignes[] = ['libelle' => 'Frais de déplacement', 'montantCents' => $r->travelFee()->cents];
        }
        if ($r->remiseFidelite()->cents > 0) {
            $lignes[] = ['libelle' => 'Remise carte de fidélité', 'montantCents' => -$r->remiseFidelite()->cents];
        }
        if ($r->avoirUtilise()->cents > 0) {
            $lignes[] = ['libelle' => 'Avoir déduit (déjà réglé)', 'montantCents' => -$r->avoirUtilise()->cents];
        }
        foreach ($r->produits() as $p) {
            $lignes[] = ['libelle' => sprintf('%s%s', $p['quantite'] > 1 ? $p['quantite'] . ' × ' : '', $p['nom']), 'montantCents' => Money::cents($p['prixCents'])->multiply($p['quantite'])->cents];
        }

        return $lignes;
    }

    /** @return array<string, string> */
    private function client(Reservation $r): array
    {
        try {
            $user = $this->users->get($r->userId());
            $nom = trim($user->firstname() . ' ' . $user->lastname());
            $email = $user->email();
        } catch (NotFound) {
            $nom = '';
            $email = '';
        }
        $m = $r->metierData();
        $texte = static fn (string $cle): string => is_string($m[$cle] ?? null) ? trim($m[$cle]) : '';

        return [
            'nom' => $nom,
            'email' => $email,
            'adresse' => $r->address(),
            'entreprise' => $texte('entreprise'),
            'siret' => $texte('siret'),
            'adresseFacturation' => $texte('adresseFacturation'),
        ];
    }
}
