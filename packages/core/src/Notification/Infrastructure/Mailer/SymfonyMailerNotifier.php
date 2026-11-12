<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Infrastructure\Mailer;

use Bsandoz\Core\Notification\Domain\Port\Notifier;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use Twig\TwigFilter;

/**
 * Mails rendus avec Twig : templates/emails/<modèle>.html.twig du kit (blocs « subject » et « body »),
 * surchargeables par l'application dans templates/bsandoz/emails/. Version texte déduite du HTML.
 * Variables communes : brand (nom affiché), front_url (liens vers le site), timezone (dates locales) ;
 * filtre « euros » pour les montants en centimes.
 * Un serveur de mail indisponible ou mal configuré ne bloque jamais l'action en cours (réservation, paiement…) :
 * l'échec est écrit dans le journal.
 */
final class SymfonyMailerNotifier implements Notifier
{
    private Environment $twig;

    private LoggerInterface $logger;

    public function __construct(
        private MailerInterface $mailer,
        private string $fromEmail,
        private string $fromName,
        string $brand,
        string $frontUrl,
        string $timezone,
        ?string $overrideDir = null,
        ?LoggerInterface $logger = null,
    ) {
        $this->logger = $logger ?? new NullLogger();
        $paths = [];
        if ($overrideDir !== null && is_dir($overrideDir)) {
            $paths[] = $overrideDir;
        }
        $paths[] = \dirname(__DIR__, 4) . '/templates/emails';

        $this->twig = new Environment(new FilesystemLoader($paths), ['strict_variables' => false, 'autoescape' => 'html']);
        $this->twig->addGlobal('brand', $brand);
        $this->twig->addGlobal('front_url', rtrim($frontUrl, '/'));
        $this->twig->addGlobal('timezone', $timezone);
        $this->twig->addFilter(new TwigFilter('euros', static fn (int|float|null $cents): string => number_format(((float) $cents) / 100, 2, ',', "\u{202F}") . "\u{00A0}€"));
    }

    public function send(string $to, string $template, array $context, array $attachments = []): void
    {
        $twig = $this->twig->load($template . '.html.twig');
        $subject = trim($twig->renderBlock('subject', $context));
        $html = $twig->render($context);

        $email = (new Email())
            ->from(new Address($this->fromEmail, $this->fromName))
            ->to($to)
            ->subject($subject)
            ->html($html)
            ->text(self::texte($twig->renderBlock('body', $context)));

        foreach ($attachments as $attachment) {
            $email->attach($attachment['content'], $attachment['name'], $attachment['mime']);
        }

        try {
            $this->mailer->send($email);
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Mail « {modele} » non envoyé à {destinataire} : {erreur}', ['modele' => $template, 'destinataire' => $to, 'erreur' => $e->getMessage()]);
        }
    }

    /** Version texte : liens gardés entre parenthèses, balises retirées, espaces resserrés. */
    private static function texte(string $html): string
    {
        $html = preg_replace('/<a\s[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/is', '$2 ($1)', $html) ?? $html;
        $html = preg_replace('/<\s*(br|\/p|\/li|\/ul)\s*\/?>/i', "\n", $html) ?? $html;
        $html = preg_replace('/<li[^>]*>/i', '- ', $html) ?? $html;
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace("/[ \t]+/", ' ', $text) ?? $text;
        $text = preg_replace("/\n\s*\n+/", "\n\n", $text) ?? $text;

        return trim(implode("\n", array_map('trim', explode("\n", $text))));
    }
}
