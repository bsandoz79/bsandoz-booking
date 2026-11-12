<?php

declare(strict_types=1);

namespace Bsandoz\Core\Fidelite\Application;

use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Bsandoz\Core\Fidelite\Domain\Model\CarteFidelite;
use Bsandoz\Core\Fidelite\Domain\Model\RegleFidelite;
use Bsandoz\Core\Fidelite\Domain\Port\CartesFidelite;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Carte de fidélité : tampon automatique à chaque prestation réalisée, ajustement à la main par le pro, remise appliquée
 * d'elle-même à la réservation suivante quand la carte est pleine (et rendue si cette réservation est annulée ou expire).
 * La règle (prestations requises, % de remise, active ou non) vient de la configuration, remplacée par le réglage du pro.
 */
final class GererFidelite
{
    public const REGLAGE = 'fidelite';

    public function __construct(
        private CartesFidelite $cartes,
        private SettingRepository $settings,
        private Clock $clock,
        private bool $actifParDefaut = true,
        private int $tamponsRequisParDefaut = 4,
        private int $remisePercentParDefaut = 20,
    ) {
    }

    public function regle(): RegleFidelite
    {
        $r = $this->settings->get(self::REGLAGE);

        return new RegleFidelite(
            is_bool($r['actif'] ?? null) ? $r['actif'] : $this->actifParDefaut,
            is_int($r['tamponsRequis'] ?? null) ? $r['tamponsRequis'] : $this->tamponsRequisParDefaut,
            is_int($r['remisePercent'] ?? null) ? $r['remisePercent'] : $this->remisePercentParDefaut,
        );
    }

    /**
     * @param array<string, mixed> $data {actif, tamponsRequis, remisePercent}
     * @throws DomainError valeurs invalides
     */
    public function modifierRegle(array $data): RegleFidelite
    {
        $actif = $data['actif'] ?? null;
        $requis = $data['tamponsRequis'] ?? null;
        $remise = $data['remisePercent'] ?? null;
        if (!is_bool($actif) || !is_int($requis) || !is_int($remise)) {
            throw new DomainError('Règle attendue : {"actif": bool, "tamponsRequis": entier, "remisePercent": entier}.');
        }
        $regle = new RegleFidelite($actif, $requis, $remise);
        $this->settings->save(self::REGLAGE, ['actif' => $actif, 'tamponsRequis' => $requis, 'remisePercent' => $remise]);

        return $regle;
    }

    /** @return array{actif: bool, tampons: int, tamponsRequis: int, remisePercent: int, remiseDisponible: bool} */
    public function carte(string $userId): array
    {
        $regle = $this->regle();
        $carte = $this->cartes->get($userId);
        $tampons = $carte?->tampons() ?? 0;

        return [
            'actif' => $regle->actif,
            'tampons' => $tampons,
            'tamponsRequis' => $regle->tamponsRequis,
            'remisePercent' => $regle->remisePercent,
            'remiseDisponible' => $carte !== null && $carte->estPleine($regle),
        ];
    }

    /** Prestation réalisée : un tampon. */
    public function tamponner(string $userId): void
    {
        if (!$this->regle()->actif) {
            return;
        }
        $carte = $this->carteOuNouvelle($userId);
        $carte->tamponner($this->clock->now());
        $this->cartes->save($carte);
    }

    /**
     * Ajout (+) ou retrait (−) de tampons par le pro.
     *
     * @return array{actif: bool, tampons: int, tamponsRequis: int, remisePercent: int, remiseDisponible: bool}
     * @throws DomainError ajustement nul ou démesuré
     */
    public function ajuster(string $userId, int $delta): array
    {
        if ($delta === 0 || abs($delta) > 50) {
            throw new DomainError('L\'ajustement doit être compris entre -50 et 50 tampons, et non nul.');
        }
        $carte = $this->carteOuNouvelle($userId);
        $carte->ajuster($delta, $this->clock->now());
        $this->cartes->save($carte);

        return $this->carte($userId);
    }

    /**
     * Carte pleine : calcule la remise sur le montant des prestations (hors déplacement) et consomme la carte.
     *
     * @return Money remise accordée (zéro si la carte n'est pas pleine ou la fidélité désactivée)
     */
    public function utiliserRemise(string $userId, Money $montantPrestations): Money
    {
        $regle = $this->regle();
        $carte = $this->cartes->get($userId);
        if ($carte === null || !$carte->estPleine($regle) || $montantPrestations->cents === 0) {
            return Money::zero();
        }
        $carte->utiliserRecompense($regle, $this->clock->now());
        $this->cartes->save($carte);

        return $montantPrestations->percent($regle->remisePercent)->min($montantPrestations);
    }

    /** Réservation remisée annulée ou expirée : la carte redevient pleine. */
    public function rendreRemise(string $userId): void
    {
        $carte = $this->carteOuNouvelle($userId);
        $carte->rendreRecompense($this->regle()->tamponsRequis, $this->clock->now());
        $this->cartes->save($carte);
    }

    /** Paiement d'une réservation remisée arrivé après son expiration : la remise rendue est reprise. */
    public function reprendreRemise(string $userId): void
    {
        $carte = $this->carteOuNouvelle($userId);
        $carte->utiliserRecompense($this->regle(), $this->clock->now());
        $this->cartes->save($carte);
    }

    private function carteOuNouvelle(string $userId): CarteFidelite
    {
        return $this->cartes->get($userId) ?? CarteFidelite::vide($userId, $this->clock->now());
    }
}
