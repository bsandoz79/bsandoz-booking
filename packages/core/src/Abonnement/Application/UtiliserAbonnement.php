<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Application;

use Bsandoz\Core\Abonnement\Domain\Port\Abonnements;
use Bsandoz\Core\Abonnement\Domain\Port\FormulesAbonnement;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Prestation réservée avec un abonnement : vérifie que l'abonnement est celui du client, qu'il couvre la date, que la
 * prestation est celle comprise (un seul véhicule), et qu'aucune autre prestation de l'abonnement n'est prévue dans la
 * même période (une par période ; une période passée sans prestation est perdue). Renvoie le prix de la prestation
 * comprise, déduit de la réservation (options et déplacement restent à payer).
 */
final class UtiliserAbonnement
{
    public function __construct(
        private Abonnements $abonnements,
        private FormulesAbonnement $formules,
        private PrestationRepository $prestations,
        private ReservationRepository $reservations,
        private SettingsProvider $settings,
    ) {
    }

    /**
     * @param list<string> $composantes
     * @param string|null $ignorerReservationId réservation déplacée (ne compte pas comme déjà prise)
     * @throws NotFound|DomainError
     */
    public function remise(
        string $abonnementId,
        string $userId,
        string $prestationId,
        ?string $variante,
        int $quantite,
        array $composantes,
        \DateTimeImmutable $date,
        ?string $ignorerReservationId = null,
    ): Money {
        $abonnement = $this->abonnements->get($abonnementId);
        if ($abonnement->userId() !== $userId) {
            throw new DomainError('Cet abonnement est rattaché à un autre compte : connectez-vous avec l\'adresse e-mail de l\'abonnement.');
        }
        if (!$abonnement->couvre($date)) {
            throw new DomainError('Votre abonnement ne couvre pas cette date (pas encore actif, prélèvement en attente ou résiliation à cette date).');
        }
        $formule = $this->formules->get($abonnement->formuleId());
        $prestation = $this->prestations->get($formule->prestationId());
        if ($prestationId !== $formule->prestationId() || $composantes !== []) {
            throw new DomainError(sprintf('Votre abonnement comprend « %s » : choisissez cette formule pour utiliser votre lavage.', $prestation->name()));
        }
        if ($quantite !== 1) {
            throw new DomainError('L\'abonnement comprend un véhicule par prestation.');
        }

        $periode = $abonnement->periodeDe($date);
        foreach ($this->reservations->forUser($userId) as $r) {
            if ($r->abonnementId() !== $abonnementId || $r->id() === $ignorerReservationId
                || in_array($r->status(), [ReservationStatus::Cancelled, ReservationStatus::Expired], true)) {
                continue;
            }
            $debut = $r->period()->start;
            if ($periode !== null && $debut >= $periode->start && $debut < $periode->end) {
                throw new DomainError(sprintf(
                    'La prestation de cette période est déjà réservée. La période suivante commence le %s.',
                    $periode->end->setTimezone($this->settings->timezone())->format('d/m/Y'),
                ));
            }
        }

        return $prestation->priceFor($variante);
    }
}
