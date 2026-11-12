<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Notification;

use Bsandoz\Core\Notification\Application\EnvoyerDemandeContact;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Tests\Double\RecordingNotifier;
use PHPUnit\Framework\TestCase;

final class EnvoyerDemandeContactTest extends TestCase
{
    private const DEMANDE = ['nom' => 'Alex Martin', 'email' => 'alex@transport.test', 'entreprise' => 'Transports Martin', 'message' => 'Devis pour 3 utilitaires.',
        'details' => ['Type de véhicules' => 'Utilitaires', 'Nombre de véhicules' => '3', 'Vide' => '']];

    public function testTransmiseAuProAvecLAdresseDeReponse(): void
    {
        $notifier = new RecordingNotifier();
        (new EnvoyerDemandeContact($notifier, 'pro@example.test'))(self::DEMANDE);

        $envoi = $notifier->of('pro_contact_request')[0];
        self::assertSame('pro@example.test', $envoi['to']);
        self::assertSame('alex@transport.test', $envoi['context']['replyTo']);
        self::assertSame(['Type de véhicules' => 'Utilitaires', 'Nombre de véhicules' => '3'], $envoi['context']['details'], 'réponses vides retirées');
    }

    public function testChampPiegeRempliIgnoreSansErreur(): void
    {
        $notifier = new RecordingNotifier();
        (new EnvoyerDemandeContact($notifier, 'pro@example.test'))(self::DEMANDE + ['site' => 'http://spam.test']);
        self::assertSame([], $notifier->of('pro_contact_request'));
    }

    public function testEmailInvalide(): void
    {
        $this->expectException(DomainError::class);
        (new EnvoyerDemandeContact(new RecordingNotifier(), 'pro@example.test'))(['email' => 'pas-un-mail'] + self::DEMANDE);
    }

    public function testSansAdresseDuProLaDemandeEstRefuseeClairement(): void
    {
        $this->expectExceptionMessage('pas encore disponible');
        (new EnvoyerDemandeContact(new RecordingNotifier(), null))(self::DEMANDE);
    }
}
