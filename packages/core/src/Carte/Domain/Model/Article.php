<?php

declare(strict_types=1);

namespace Bsandoz\Core\Carte\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Un article de la carte (un plat, une boisson, un service…) que le pro modifie lui-même.
 * - Prix changé : l'ancien prix reste affiché barré à côté du nouveau pendant DUREE_MISE_EN_AVANT, puis disparaît.
 * - Article ajouté : « Nouveau » pendant DUREE_MISE_EN_AVANT.
 * - « Épuisé » : jusqu'au début du jour suivant (heure locale du commerce), puis l'article revient tout seul.
 * Le kit ne connaît pas le métier : un article n'est qu'un nom, une description, un prix et une photo.
 */
final class Article
{
    public const DUREE_MISE_EN_AVANT = '+1 month';
    public const NOM_MAX = 120;
    public const DESCRIPTION_MAX = 500;

    private ?int $ancienPrixCents = null;
    private ?\DateTimeImmutable $prixChangeLe = null;
    private ?\DateTimeImmutable $epuiseJusquA = null;

    public function __construct(
        private string $id,
        private string $categorieId,
        private string $nom,
        private Money $prix,
        private \DateTimeImmutable $creeLe,
        private string $description = '',
        private int $position = 0,
        private bool $visible = true,
        /** Chemin public de la photo (réduite à l'envoi), null : pas de photo. */
        private ?string $photo = null,
    ) {
        $this->verifierTextes($nom, $description);
        $this->nom = trim($nom);
        $this->description = trim($description);
    }

    public function id(): string { return $this->id; }
    public function categorieId(): string { return $this->categorieId; }
    public function nom(): string { return $this->nom; }
    public function description(): string { return $this->description; }
    public function prix(): Money { return $this->prix; }
    public function position(): int { return $this->position; }
    public function estVisible(): bool { return $this->visible; }
    public function photo(): ?string { return $this->photo; }
    public function creeLe(): \DateTimeImmutable { return $this->creeLe; }

    /** Nom, description, catégorie et visibilité (le prix a sa propre règle : `changerPrix`). */
    public function modifier(string $nom, string $description, string $categorieId, bool $visible): void
    {
        $this->verifierTextes($nom, $description);
        $this->nom = trim($nom);
        $this->description = trim($description);
        $this->categorieId = $categorieId;
        $this->visible = $visible;
    }

    /**
     * Nouveau prix : l'ancien reste affiché barré pendant un mois. Un prix inchangé ne fait rien.
     * Deux changements dans le mois : c'est le prix d'avant le dernier changement qui est barré.
     */
    public function changerPrix(Money $nouveau, \DateTimeImmutable $maintenant): void
    {
        if ($nouveau->cents === $this->prix->cents) {
            return;
        }
        $this->ancienPrixCents = $this->prix->cents;
        $this->prixChangeLe = $maintenant;
        $this->prix = $nouveau;
    }

    /** Ancien prix à afficher barré, tant que le changement date de moins d'un mois. */
    public function prixBarre(\DateTimeImmutable $maintenant): ?Money
    {
        if ($this->ancienPrixCents === null || $this->prixChangeLe === null) {
            return null;
        }

        return $this->prixChangeLe->modify(self::DUREE_MISE_EN_AVANT) > $maintenant ? Money::cents($this->ancienPrixCents) : null;
    }

    /** « Nouveau » pendant le mois qui suit l'ajout. */
    public function estNouveau(\DateTimeImmutable $maintenant): bool
    {
        return $this->creeLe->modify(self::DUREE_MISE_EN_AVANT) > $maintenant;
    }

    /** « Épuisé » jusqu'au début du jour suivant, à l'heure du commerce (`$fuseau`, ex. Europe/Paris). */
    public function marquerEpuise(\DateTimeImmutable $maintenant, \DateTimeZone $fuseau): void
    {
        $this->epuiseJusquA = $maintenant->setTimezone($fuseau)->modify('tomorrow')->setTimezone(new \DateTimeZone('UTC'));
    }

    public function remettreEnVente(): void
    {
        $this->epuiseJusquA = null;
    }

    public function estEpuise(\DateTimeImmutable $maintenant): bool
    {
        return $this->epuiseJusquA !== null && $this->epuiseJusquA > $maintenant;
    }

    public function changerPosition(int $position): void
    {
        $this->position = max(0, $position);
    }

    public function changerPhoto(?string $photo): void
    {
        $this->photo = $photo;
    }

    private function verifierTextes(string $nom, string $description): void
    {
        $nom = trim($nom);
        if ($nom === '') {
            throw new DomainError('Le nom de l’article est obligatoire.');
        }
        if (mb_strlen($nom) > self::NOM_MAX) {
            throw new DomainError(sprintf('Le nom de l’article est limité à %d caractères.', self::NOM_MAX));
        }
        if (mb_strlen(trim($description)) > self::DESCRIPTION_MAX) {
            throw new DomainError(sprintf('La description est limitée à %d caractères.', self::DESCRIPTION_MAX));
        }
    }
}
