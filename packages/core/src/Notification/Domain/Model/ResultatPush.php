<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Model;

enum ResultatPush
{
    case Envoye;
    /** L'appareil s'est désabonné ou l'abonnement a expiré : à supprimer. */
    case Expire;
    /** Erreur passagère (réseau, service push indisponible) : l'abonnement est gardé. */
    case Echec;
}
