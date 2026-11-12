<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Application;

use Bsandoz\Core\Notification\Domain\Model\MessagePush;
use Bsandoz\Core\Notification\Domain\Model\ResultatPush;
use Bsandoz\Core\Notification\Domain\Port\AbonnementsPush;
use Bsandoz\Core\Notification\Domain\Port\EnvoiPush;

/**
 * Envoie une notification à tous les appareils abonnés (seul le pro peut s'abonner, via /admin).
 * Les abonnements expirés sont supprimés ; une erreur d'envoi n'interrompt jamais l'action en cours.
 */
final class NotifierProParPush
{
    public function __construct(
        private AbonnementsPush $abonnements,
        private EnvoiPush $envoi,
    ) {
    }

    /** @return int nombre d'appareils notifiés */
    public function __invoke(MessagePush $message): int
    {
        if (!$this->envoi->actif()) {
            return 0;
        }
        $envoyes = 0;
        foreach ($this->abonnements->tous() as $abonnement) {
            $resultat = $this->envoi->envoyer($abonnement, $message);
            if ($resultat === ResultatPush::Envoye) {
                ++$envoyes;
            } elseif ($resultat === ResultatPush::Expire) {
                $this->abonnements->supprimer($abonnement);
            }
        }

        return $envoyes;
    }
}
