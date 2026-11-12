<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Application;

use Bsandoz\Core\Notification\Domain\Model\AbonnementPush;
use Bsandoz\Core\Notification\Domain\Port\AbonnementsPush;
use Bsandoz\Core\Notification\Domain\Port\EnvoiPush;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;

/**
 * Abonnement des appareils du pro aux notifications push (nouveau rendez-vous, annulation, déplacement).
 * Un appareil = un endpoint : se réabonner remplace l'abonnement précédent du même appareil.
 */
final class GererAbonnementsPush
{
    public function __construct(
        private AbonnementsPush $abonnements,
        private EnvoiPush $envoi,
        private IdGenerator $ids,
        private Clock $clock,
    ) {
    }

    /** @throws DomainError push non configuré ou abonnement invalide */
    public function abonner(string $userId, string $endpoint, string $publicKey, string $authToken): void
    {
        if (!$this->envoi->actif()) {
            throw new DomainError('Les notifications ne sont pas configurées sur ce site.');
        }
        if (!str_starts_with($endpoint, 'https://') || strlen($endpoint) > 1000 || $publicKey === '' || $authToken === ''
            || preg_match('/^[A-Za-z0-9_-]+=*$/', $publicKey . $authToken) !== 1) {
            throw new DomainError('Abonnement aux notifications invalide.');
        }

        $existant = $this->abonnements->parEndpoint($endpoint);
        if ($existant !== null) {
            $this->abonnements->supprimer($existant);
        }
        $this->abonnements->enregistrer(new AbonnementPush($this->ids->generate(), $userId, $endpoint, $publicKey, $authToken, $this->clock->now()));
    }

    /** Désabonne l'appareil (sans effet s'il n'est pas abonné ou appartient à un autre compte). */
    public function desabonner(string $userId, string $endpoint): void
    {
        $abonnement = $this->abonnements->parEndpoint($endpoint);
        if ($abonnement !== null && $abonnement->userId === $userId) {
            $this->abonnements->supprimer($abonnement);
        }
    }

    public function clePublique(): ?string
    {
        return $this->envoi->clePublique();
    }
}
