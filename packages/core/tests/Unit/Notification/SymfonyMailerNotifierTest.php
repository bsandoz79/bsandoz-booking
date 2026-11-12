<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Notification;

use Bsandoz\Core\Notification\Infrastructure\Mailer\SymfonyMailerNotifier;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Psr\Log\AbstractLogger;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\RawMessage;

final class SymfonyMailerNotifierTest extends TestCase
{
    /** @var list<Email> */
    private array $envoyes = [];

    private function notifier(?string $overrideDir = null): SymfonyMailerNotifier
    {
        $this->envoyes = [];
        $test = $this;
        $mailer = new class($test) implements MailerInterface {
            public function __construct(private SymfonyMailerNotifierTest $test)
            {
            }

            public function send(RawMessage $message, ?Envelope $envelope = null): void
            {
                if ($message instanceof Email) {
                    $this->test->recevoir($message);
                }
            }
        };

        return new SymfonyMailerNotifier($mailer, 'contact@marque.test', 'Marque', 'Marque', 'https://site.test/', 'Europe/Paris', $overrideDir);
    }

    public function recevoir(Email $email): void
    {
        $this->envoyes[] = $email;
    }

    private function dernier(): Email
    {
        $dernier = end($this->envoyes);
        self::assertInstanceOf(Email::class, $dernier, 'un mail a été envoyé');

        return $dernier;
    }

    public function testActivationAvecLienEtExpediteur(): void
    {
        $this->notifier()->send('camille@example.test', 'activation', ['firstname' => 'Camille', 'token' => 'abc123']);

        $email = $this->dernier();
        self::assertSame('Créez votre mot de passe', $email->getSubject());
        self::assertSame('camille@example.test', $email->getTo()[0]->getAddress());
        self::assertSame('contact@marque.test', $email->getFrom()[0]->getAddress());
        self::assertSame('Marque', $email->getFrom()[0]->getName());
        self::assertStringContainsString('href="https://site.test/compte/activer?jeton=abc123"', (string) $email->getHtmlBody());
        self::assertStringContainsString('Bonjour Camille', (string) $email->getTextBody());
        self::assertStringContainsString('(https://site.test/compte/activer?jeton=abc123)', (string) $email->getTextBody(), 'lien conservé en texte');
        self::assertStringNotContainsString('<', (string) $email->getTextBody());
    }

    public function testConfirmationAvecDateLocaleMontantEtPieceJointe(): void
    {
        $this->notifier()->send('camille@example.test', 'booking_confirmed', [
            'firstname' => 'Camille', 'start' => '2026-11-10T08:00:00+00:00', 'depositCents' => 2070, 'manageToken' => 'tok', 'address' => '1 rue de l\'Exemple',
        ], [['name' => 'rendez-vous.ics', 'content' => "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n", 'mime' => 'text/calendar']]);

        $email = $this->dernier();
        $html = (string) $email->getHtmlBody();
        self::assertStringContainsString('10/11/2026 à 09h00', $html, 'heure de Paris');
        self::assertStringContainsString("20,70\u{00A0}€", $html);
        self::assertStringContainsString('/rendez-vous?jeton=tok', $html);
        self::assertStringContainsString('1 rue de l&#039;Exemple', $html, 'contenu échappé');
        $pieces = $email->getAttachments();
        self::assertCount(1, $pieces);
        self::assertSame('rendez-vous.ics', $pieces[0]->getFilename());
        self::assertSame('text/calendar', $pieces[0]->getMediaType() . '/' . $pieces[0]->getMediaSubtype());
    }

    /** @return iterable<string, array{string, array<string, mixed>, string}> */
    public static function modeles(): iterable
    {
        $base = ['firstname' => 'Camille', 'start' => '2026-11-10T08:00:00+00:00', 'client' => 'Camille Martin', 'totalCents' => 6900];
        yield 'mot de passe oublié' => ['password_reset', $base + ['token' => 't'], 'Réinitialisation de votre mot de passe'];
        yield 'annulation remboursée' => ['booking_cancelled', $base + ['refundable' => true], 'Votre rendez-vous est annulé'];
        yield 'déplacement' => ['booking_moved', $base, 'Votre rendez-vous a été déplacé'];
        yield 'rappel' => ['reminder', $base + ['manageToken' => 't'], 'Rappel : votre rendez-vous de demain'];
        yield 'remboursement' => ['payment_refunded', $base + ['amountCents' => 2070, 'reason' => 'creneau_indisponible'], 'Remboursement de votre acompte'];
        yield 'pro : nouveau' => ['pro_new_booking', $base + ['phone' => '0600000000'], 'Nouveau rendez-vous le 10/11/2026'];
        yield 'pro : annulation' => ['pro_booking_cancelled', $base + ['refundable' => false], 'Rendez-vous annulé : 10/11/2026'];
        yield 'pro : déplacement' => ['pro_booking_moved', $base + ['previousStart' => '2026-11-09T08:00:00+00:00'], 'Rendez-vous déplacé au 10/11/2026'];
    }

    /** @param array<string, mixed> $context */
    #[DataProvider('modeles')]
    public function testChaqueModeleSeRendAvecSonSujet(string $template, array $context, string $sujet): void
    {
        $this->notifier()->send('destinataire@example.test', $template, $context);

        self::assertSame($sujet, $this->dernier()->getSubject());
        self::assertNotSame('', (string) $this->dernier()->getTextBody());
    }

    public function testConfirmationAvecPaiementSurPlace(): void
    {
        $this->notifier()->send('camille@example.test', 'booking_confirmed', [
            'firstname' => 'Camille', 'start' => '2026-11-10T08:00:00+00:00', 'manageToken' => 't', 'enLigneCents' => 0, 'surPlaceCents' => 6900,
        ]);
        self::assertStringContainsString('À régler sur place, une fois la prestation terminée : 69,00', (string) $this->dernier()->getTextBody());
    }

    public function testDemandeDeDevisAvecAdresseDeReponse(): void
    {
        $this->notifier()->send('pro@example.test', 'pro_contact_request', [
            'nom' => 'Alex Martin', 'email' => 'alex@transport.test', 'telephone' => '06 00 00 00 00', 'entreprise' => 'Transports Martin',
            'message' => "3 utilitaires\nà nettoyer", 'details' => ['Type de véhicules' => 'Utilitaires'], 'replyTo' => 'alex@transport.test',
        ]);

        self::assertSame('Demande de devis : Alex Martin (Transports Martin)', $this->dernier()->getSubject());
        self::assertSame('alex@transport.test', $this->dernier()->getReplyTo()[0]->getAddress());
        self::assertStringContainsString('Type de véhicules : Utilitaires', (string) $this->dernier()->getTextBody());
    }

    public function testModeleSurchargeParLApplication(): void
    {
        $dir = sys_get_temp_dir() . '/bsandoz-mails-' . bin2hex(random_bytes(4));
        mkdir($dir);
        file_put_contents($dir . '/activation.html.twig', "{% extends '_base.html.twig' %}{% block subject %}Bienvenue chez {{ brand }}{% endblock %}{% block body %}Texte personnalisé{% endblock %}");

        try {
            $this->notifier($dir)->send('camille@example.test', 'activation', ['firstname' => 'Camille', 'token' => 't']);
        } finally {
            unlink($dir . '/activation.html.twig');
            rmdir($dir);
        }

        self::assertSame('Bienvenue chez Marque', $this->dernier()->getSubject());
        self::assertStringContainsString('Texte personnalisé', (string) $this->dernier()->getTextBody());
    }

    public function testServeurDeMailEnPanneNeBloquePasEtEstJournalise(): void
    {
        $mailer = new class implements MailerInterface {
            public function send(RawMessage $message, ?Envelope $envelope = null): void
            {
                throw new TransportException('Connection could not be established');
            }
        };
        $journal = new class extends AbstractLogger {
            /** @var list<string> */
            public array $erreurs = [];

            public function log($level, \Stringable|string $message, array $context = []): void
            {
                $this->erreurs[] = $level . ' ' . strtr((string) $message, ['{modele}' => (string) $context['modele'], '{erreur}' => (string) $context['erreur']]);
            }
        };

        (new SymfonyMailerNotifier($mailer, 'contact@marque.test', 'Marque', 'Marque', 'https://site.test/', 'Europe/Paris', null, $journal))
            ->send('camille@example.test', 'activation', ['firstname' => 'Camille', 'token' => 't']);

        self::assertCount(1, $journal->erreurs);
        self::assertStringStartsWith('error Mail « activation »', $journal->erreurs[0]);
        self::assertStringContainsString('Connection could not be established', $journal->erreurs[0]);
    }
}
