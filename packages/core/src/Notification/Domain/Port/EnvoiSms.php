<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Port;

/**
 * Envoi de SMS (confirmation, rappel…). Désactivé par défaut (aucun fournisseur) ; un fournisseur se choisit par la
 * configuration, sans toucher au code (voir docs/deploiement.md, « SMS »). Un échec d'envoi ne bloque jamais l'action.
 */
interface EnvoiSms
{
    /** Vrai si un fournisseur est configuré. */
    public function actif(): bool;

    /** @param string $numero numéro au format international (+33612345678) */
    public function envoyer(string $numero, string $texte): void;
}
