<?php

declare(strict_types=1);

namespace App\Tests\Double;

use Bsandoz\Core\Notification\Domain\Model\AbonnementPush;
use Bsandoz\Core\Notification\Domain\Model\MessagePush;
use Bsandoz\Core\Notification\Domain\Model\ResultatPush;
use Bsandoz\Core\Notification\Domain\Port\EnvoiPush;

/**
 * Faux service push pour les tests fonctionnels (config/services.yaml, environnement de test) : aucun appel réseau,
 * messages gardés en mémoire statique (le noyau redémarre entre deux requêtes).
 */
final class FauxEnvoiPush implements EnvoiPush
{
    /** @var list<array{endpoint: string, title: string, body: string}> */
    public static array $envoyes = [];

    public function actif(): bool
    {
        return true;
    }

    public function clePublique(): string
    {
        return 'cle-publique-de-test';
    }

    public function envoyer(AbonnementPush $abonnement, MessagePush $message): ResultatPush
    {
        self::$envoyes[] = ['endpoint' => $abonnement->endpoint, 'title' => $message->title, 'body' => $message->body];

        return ResultatPush::Envoye;
    }
}
