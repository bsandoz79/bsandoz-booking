<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Notification\Domain\Model\AbonnementPush;
use Bsandoz\Core\Notification\Domain\Model\MessagePush;
use Bsandoz\Core\Notification\Domain\Model\ResultatPush;
use Bsandoz\Core\Notification\Domain\Port\EnvoiPush;

/** Envoi push simulé : enregistre les messages ; réponse configurable par endpoint. */
final class FakeEnvoiPush implements EnvoiPush
{
    /** @var list<array{endpoint: string, message: MessagePush}> */
    public array $envoyes = [];

    /** @var array<string, ResultatPush> */
    public array $reponses = [];

    public function __construct(private bool $actif = true)
    {
    }

    public function actif(): bool
    {
        return $this->actif;
    }

    public function clePublique(): ?string
    {
        return $this->actif ? 'cle-publique' : null;
    }

    public function envoyer(AbonnementPush $abonnement, MessagePush $message): ResultatPush
    {
        $resultat = $this->reponses[$abonnement->endpoint] ?? ResultatPush::Envoye;
        if ($resultat === ResultatPush::Envoye) {
            $this->envoyes[] = ['endpoint' => $abonnement->endpoint, 'message' => $message];
        }

        return $resultat;
    }
}
