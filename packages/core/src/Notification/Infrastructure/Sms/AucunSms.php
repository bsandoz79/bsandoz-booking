<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Sms;

use Bsandoz\Core\Notification\Domain\Port\EnvoiSms;

/** Aucun fournisseur de SMS configuré (par défaut) : rien n'est envoyé. */
final class AucunSms implements EnvoiSms
{
    public function actif(): bool
    {
        return false;
    }

    public function envoyer(string $numero, string $texte): void
    {
    }
}
