<?php

declare(strict_types=1);

namespace Bsandoz\Core\Comptabilite\Application;

use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Comptabilite\Domain\Model\Depense;
use Bsandoz\Core\Comptabilite\Domain\Port\Depenses;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Comptabilité simple du pro, par mois (heure locale) : chiffre d'affaires (prestations faites, produits compris),
 * dépenses (ponctuelles ou mensuelles) et résultat. Outil de suivi, pas une comptabilité légale.
 *
 * @phpstan-type DepenseVue array{id: string, le: string, libelle: string, montantCents: int, mensuelle: bool, finLe: string|null}
 */
final class GererComptabilite
{
    public function __construct(
        private Depenses $depenses,
        private ReservationRepository $reservations,
        private SettingsProvider $settings,
        private IdGenerator $ids,
        private Clock $clock,
    ) {
    }

    /**
     * @return array{annee: int, mois: list<array{mois: string, chiffreAffairesCents: int, depensesCents: int, resultatCents: int}>, totaux: array{chiffreAffairesCents: int, depensesCents: int, resultatCents: int}, parMoyenCents: array<string, int>, depenses: list<DepenseVue>}
     * @throws DomainError année invalide
     */
    public function bilan(int $annee): array
    {
        if ($annee < 2000 || $annee > 2100) {
            throw new DomainError('Année invalide.');
        }
        $tz = $this->settings->timezone();
        $debut = new \DateTimeImmutable(sprintf('%d-01-01', $annee), $tz);
        $ca = array_fill_keys(array_map(static fn (int $m): string => sprintf('%d-%02d', $annee, $m), range(1, 12)), 0);
        // Recettes de l'année par moyen de paiement (en ligne, puis chaque moyen sur place ; « nonPrecise » : marqué fait sans moyen).
        $parMoyen = ['enLigne' => 0, 'carte' => 0, 'qr' => 0, 'especes' => 0, 'virement' => 0, 'cheque' => 0, 'nonPrecise' => 0];
        foreach ($this->reservations->between($debut, $debut->modify('+1 year')) as $r) {
            if ($r->status() !== ReservationStatus::Done) {
                continue;
            }
            $mois = $r->period()->start->setTimezone($tz)->format('Y-m');
            if (isset($ca[$mois])) {
                $ca[$mois] += self::encaisse($r);
                $enLigne = $r->aPayerEnLigne()->min($r->total()->add($r->totalProduits()))->cents;
                $parMoyen['enLigne'] += $enLigne;
                $moyen = $r->moyenSurPlace();
                $parMoyen[$moyen === null ? 'nonPrecise' : $moyen->value] += self::encaisse($r) - $enLigne;
            }
        }

        $toutes = $this->depenses->toutes();
        // Les mois à venir ne comptent pas encore les dépenses mensuelles.
        $moisCourant = $this->clock->now()->setTimezone($tz)->format('Y-m');
        $mois = [];
        foreach ($ca as $m => $chiffre) {
            $depense = $m > $moisCourant ? array_sum(array_map(static fn (Depense $d): int => $d->mensuelle() ? 0 : $d->pourLeMois($m)->cents, $toutes))
                : array_sum(array_map(static fn (Depense $d): int => $d->pourLeMois($m)->cents, $toutes));
            $mois[] = ['mois' => $m, 'chiffreAffairesCents' => $chiffre, 'depensesCents' => $depense, 'resultatCents' => $chiffre - $depense];
        }
        $somme = static function (string $cle) use ($mois): int {
            $total = 0;
            foreach ($mois as $m) {
                $total += $m[$cle];
            }

            return $total;
        };

        return [
            'annee' => $annee,
            'mois' => $mois,
            'totaux' => ['chiffreAffairesCents' => $somme('chiffreAffairesCents'), 'depensesCents' => $somme('depensesCents'), 'resultatCents' => $somme('resultatCents')],
            'parMoyenCents' => $parMoyen,
            'depenses' => array_values(array_map(self::vue(...), array_filter($toutes, static fn (Depense $d): bool => (int) $d->le()->format('Y') === $annee
                || ($d->mensuelle() && (int) $d->le()->format('Y') < $annee && ($d->finLe() === null || (int) $d->finLe()->format('Y') >= $annee))))),
        ];
    }

    /**
     * @param array<string, mixed> $data {le: AAAA-MM-JJ, libelle, montantCents, mensuelle}
     * @return DepenseVue
     * @throws DomainError
     */
    public function ajouter(array $data): array
    {
        $le = is_string($data['le'] ?? null) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $data['le'], $this->settings->timezone()) : false;
        if ($le === false || $le->format('Y-m-d') !== $data['le']) {
            throw new DomainError('« le » : date au format AAAA-MM-JJ.');
        }
        $montant = $data['montantCents'] ?? null;
        if (!is_int($montant)) {
            throw new DomainError('« montantCents » : montant en centimes.');
        }
        $libelle = $data['libelle'] ?? '';
        $depense = new Depense($this->ids->generate(), $le, is_string($libelle) ? $libelle : '', Money::cents($montant), ($data['mensuelle'] ?? false) === true);
        $this->depenses->save($depense);

        return self::vue($depense);
    }

    /**
     * Dépense mensuelle : arrêtée ce mois-ci (l'historique reste). Ponctuelle : supprimée.
     *
     * @throws NotFound
     */
    public function retirer(string $id): void
    {
        $depense = $this->depenses->get($id);
        $aujourdhui = $this->clock->now()->setTimezone($this->settings->timezone());
        if ($depense->mensuelle() && $depense->le() < $aujourdhui->modify('first day of this month')->setTime(0, 0)) {
            $depense->arreter($aujourdhui);
            $this->depenses->save($depense);

            return;
        }
        $this->depenses->supprimer($depense);
    }

    /** Prestation faite : total et produits. */
    private static function encaisse(Reservation $r): int
    {
        return $r->total()->add($r->totalProduits())->cents;
    }

    /** @return DepenseVue */
    private static function vue(Depense $d): array
    {
        return [
            'id' => $d->id(), 'le' => $d->le()->format('Y-m-d'), 'libelle' => $d->libelle(), 'montantCents' => $d->montant()->cents,
            'mensuelle' => $d->mensuelle(), 'finLe' => $d->finLe()?->format('Y-m-d'),
        ];
    }
}
