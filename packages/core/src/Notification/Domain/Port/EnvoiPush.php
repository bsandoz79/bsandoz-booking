<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Domain\Port;

use Bsandoz\Core\Notification\Domain\Model\AbonnementPush;
use Bsandoz\Core\Notification\Domain\Model\MessagePush;
use Bsandoz\Core\Notification\Domain\Model\ResultatPush;

/** Envoi d'une notification Web Push (chiffrée, signée VAPID). Ne lève jamais d'exception. */
interface EnvoiPush
{
    public function actif(): bool;

    /** Clé publique VAPID à donner au navigateur pour s'abonner (null : push non configuré). */
    public function clePublique(): ?string;

    public function envoyer(AbonnementPush $abonnement, MessagePush $message): ResultatPush;
}
