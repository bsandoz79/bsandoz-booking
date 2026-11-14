<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Domain\Model;

enum StatutAbonnement: string
{
    /** Souscription commencée, premier paiement pas encore reçu. */
    case EnAttente = 'en_attente';
    case Actif = 'actif';
    /** Prélèvement refusé : le prestataire réessaie ; plus de réservation tant que ce n'est pas réglé. */
    case Impaye = 'impaye';
    case Termine = 'termine';
}
