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
 * Variables communes : brand (nom affiché), front_url (liens vers le site), timezone (dates locales), logo_url, contact_email ;
 * filtres « euros » (montants en centimes), « date_longue » (« mardi 17 novembre 2026 à 9 h 00 ») et « jour_long ».
 * Réponse : clé de contexte « replyTo » (ex. demande de devis), sinon l'adresse du pro ($replyTo) pour les mails aux
 * clients, qui peuvent ainsi répondre directement.
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
        /** Adresse du pro : réponse des clients (et contact affiché en pied de mail). */
        private ?string $replyTo = null,
        /** Logo de l'en-tête (adresse publique) ; par défaut <front_url>/logo.png. */
        ?string $logoUrl = null,
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
        $this->twig->addGlobal('logo_url', $logoUrl !== null && $logoUrl !== '' ? $logoUrl : ($frontUrl !== '' ? rtrim($frontUrl, '/') . '/logo.png' : ''));
        $this->twig->addGlobal('contact_email', $replyTo !== null && filter_var($replyTo, FILTER_VALIDATE_EMAIL) !== false ? $replyTo : '');
        $this->twig->addFilter(new TwigFilter('jour_long', static fn (?string $iso): string => self::jourLong($iso, $timezone)));
        $this->twig->addFilter(new TwigFilter('date_longue', static function (?string $iso) use ($timezone): string {
            if ($iso === null || $iso === '') {
                return '';
            }
            $d = (new \DateTimeImmutable($iso))->setTimezone(new \DateTimeZone($timezone));

            return sprintf('%s à %s h %s', self::jourLong($iso, $timezone), $d->format('G'), $d->format('i'));
        }));
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
        // « replyTo » dans le contexte : répondre au mail écrit directement à cette adresse (ex. demande de devis).
        $replyTo = $context['replyTo'] ?? null;
        if (is_string($replyTo) && filter_var($replyTo, FILTER_VALIDATE_EMAIL) !== false) {
            $email->replyTo($replyTo);
        } elseif ($this->replyTo !== null && filter_var($this->replyTo, FILTER_VALIDATE_EMAIL) !== false && strcasecmp($this->replyTo, $to) !== 0) {
            // Mail à un client : sa réponse arrive chez le pro.
            $email->replyTo($this->replyTo);
        }

        foreach ($attachments as $attachment) {
            $email->attach($attachment['content'], $attachment['name'], $attachment['mime']);
        }

        try {
            $this->mailer->send($email);
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Mail « {modele} » non envoyé à {destinataire} : {erreur}', ['modele' => $template, 'destinataire' => $to, 'erreur' => $e->getMessage()]);
        }
    }

    /** « mardi 17 novembre 2026 » (heure locale), sans dépendre de l'extension intl. */
    private static function jourLong(?string $iso, string $timezone): string
    {
        if ($iso === null || $iso === '') {
            return '';
        }
        $d = (new \DateTimeImmutable($iso))->setTimezone(new \DateTimeZone($timezone));
        $jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        $mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

        return sprintf('%s %d %s %s', $jours[(int) $d->format('N') - 1], (int) $d->format('j'), $mois[(int) $d->format('n') - 1], $d->format('Y'));
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
