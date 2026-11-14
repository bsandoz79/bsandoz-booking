<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Notification\Application\NotifierProParPush;
use Bsandoz\Core\Notification\Domain\Model\MessagePush;
use Bsandoz\Core\Notification\Domain\Port\Notifier;
use Bsandoz\Core\Notification\Domain\Service\IcsGenerator;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Mails d'une réservation, au client et au pro (si son adresse est configurée), et notification push sur les appareils du pro.
 * Le contenu (dates locales, montants, liens) est mis en forme par les modèles Twig du Notifier.
 */
final class NotificationsReservation
{
    public function __construct(
        private Notifier $notifier,
        private UserRepository $users,
        private PrestationRepository $prestations,
        private IcsGenerator $ics,
        private string $brand,
        private ?string $proEmail = null,
        private ?NotifierProParPush $push = null,
        private string $timezone = 'UTC',
        private ?\Bsandoz\Core\Notification\Domain\Port\EnvoiSms $sms = null,
    ) {
    }

    /** Rendez-vous confirmé (acompte payé ou sans acompte) : confirmation avec .ics au client, alerte au pro. */
    public function confirmee(Reservation $reservation, string $manageToken): void
    {
        [$user, $context] = $this->contexte($reservation);
        $this->notifier->send($user->email(), 'booking_confirmed', $context + ['manageToken' => $manageToken], [$this->piece($reservation, $context)]);
        $this->auPro('pro_new_booking', $context);
        $this->pousser('Nouveau rendez-vous', $reservation, $context);
        $this->texto($user, sprintf('%s : votre rendez-vous du %s est confirmé. Détails et gestion dans l\'e-mail reçu.', $this->brand, $this->quand($reservation)));
    }

    /** @param Money|null $avoir avoir crédité au client (annulation tardive), null : pas d'avoir */
    public function annulee(Reservation $reservation, bool $refundable, ?Money $avoir = null): void
    {
        [$user, $context] = $this->contexte($reservation);
        $context += ['refundable' => $refundable, 'avoirCents' => $avoir === null ? 0 : $avoir->cents];
        $this->notifier->send($user->email(), 'booking_cancelled', $context);
        $this->auPro('pro_booking_cancelled', $context);
        $this->pousser('Rendez-vous annulé', $reservation, $context);
        $this->texto($user, sprintf('%s : votre rendez-vous du %s est annulé.', $this->brand, $this->quand($reservation)));
    }

    public function deplacee(Reservation $reservation, \DateTimeImmutable $previousStart): void
    {
        [$user, $context] = $this->contexte($reservation);
        $context['previousStart'] = self::iso($previousStart);
        $this->notifier->send($user->email(), 'booking_moved', $context, [$this->piece($reservation, $context)]);
        $this->auPro('pro_booking_moved', $context);
        $this->pousser('Rendez-vous déplacé', $reservation, $context);
        $this->texto($user, sprintf('%s : votre rendez-vous est déplacé au %s.', $this->brand, $this->quand($reservation)));
    }

    /** Rendez-vous pris par téléphone : lien de paiement de l'acompte envoyé au client. */
    public function lienAcompte(Reservation $reservation, string $paymentUrl): void
    {
        [$user, $context] = $this->contexte($reservation);
        $this->notifier->send($user->email(), 'deposit_link', $context + ['paymentUrl' => $paymentUrl]);
    }

    public function rappel(Reservation $reservation, ?string $manageToken): void
    {
        [$user, $context] = $this->contexte($reservation);
        $this->notifier->send($user->email(), 'reminder', $context + ['manageToken' => $manageToken]);
        $this->texto($user, sprintf('%s : rappel de votre rendez-vous demain, %s. Un empêchement ? Gérez-le depuis l\'e-mail de confirmation.', $this->brand, $this->quand($reservation)));
    }

    /** @param string $reason ex. « creneau_indisponible » */
    public function remboursee(Reservation $reservation, Money $amount, string $reason): void
    {
        [$user, $context] = $this->contexte($reservation);
        $this->notifier->send($user->email(), 'payment_refunded', $context + ['amountCents' => $amount->cents, 'reason' => $reason]);
    }

    /** @return array{User, array<string, mixed>} */
    private function contexte(Reservation $r): array
    {
        $user = $this->users->get($r->userId());
        try {
            $prestation = \Bsandoz\Core\Catalog\Application\NomPrestation::de($this->prestations, $r->prestationId(), $r->composantes());
        } catch (NotFound) {
            $prestation = '';
        }

        return [$user, [
            'reservationId' => $r->id(),
            'firstname' => $user->firstname(),
            'client' => trim($user->firstname() . ' ' . $user->lastname()),
            'phone' => $user->phone(),
            'start' => self::iso($r->period()->start),
            'end' => self::iso($r->period()->end),
            'address' => $r->address(),
            'prestation' => $prestation,
            'totalCents' => $r->total()->cents,
            'depositCents' => $r->deposit()->cents,
            'enLigneCents' => $r->aPayerEnLigne()->cents,
            'surPlaceCents' => $r->resteSurPlace()->cents,
            'notes' => $r->notes(),
        ]];
    }

    /**
     * @param array<string, mixed> $context
     * @return array{name: string, content: string, mime: string}
     */
    private function piece(Reservation $r, array $context): array
    {
        $prestation = is_string($context['prestation'] ?? null) ? $context['prestation'] : '';

        return [
            'name' => 'rendez-vous.ics',
            'content' => $this->ics->event($r->id() . '@bsandoz', $r->period(), sprintf('Rendez-vous – %s', $this->brand), $r->address(), $prestation),
            'mime' => 'text/calendar',
        ];
    }

    /** @param array<string, mixed> $context */
    private function auPro(string $template, array $context): void
    {
        if ($this->proEmail !== null && $this->proEmail !== '') {
            $this->notifier->send($this->proEmail, $template, $context);
        }
    }

    /**
     * Notification push au pro : « prestation · client · jour à HHhMM » (heure locale du pro). N'échoue jamais.
     *
     * @param array<string, mixed> $context
     */
    private function pousser(string $titre, Reservation $r, array $context): void
    {
        if ($this->push === null) {
            return;
        }
        $debut = $r->period()->start->setTimezone(new \DateTimeZone($this->timezone));
        $jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        $mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        $quand = sprintf('%s %d %s à %sh%s', $jours[(int) $debut->format('N') - 1], (int) $debut->format('j'), $mois[(int) $debut->format('n') - 1], $debut->format('H'), $debut->format('i'));
        $texte = implode(' · ', array_filter([$context['prestation'] ?? '', $context['client'] ?? '', $quand], static fn (mixed $v): bool => is_string($v) && $v !== ''));
        try {
            ($this->push)(new MessagePush($titre, $texte, '/pro', 'rdv-' . $r->id()));
        } catch (\Throwable) {
            // Une notification manquée ne doit jamais faire échouer la réservation (le mail au pro reste envoyé).
        }
    }

    private static function iso(\DateTimeImmutable $date): string
    {
        return $date->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM);
    }

    /** SMS au client si un fournisseur est configuré et que son numéro est un mobile (sinon rien). */
    private function texto(User $user, string $texte): void
    {
        if ($this->sms === null || !$this->sms->actif()) {
            return;
        }
        $numero = \Bsandoz\Core\Notification\Domain\Service\NumeroMobile::international($user->phone());
        if ($numero !== null) {
            $this->sms->envoyer($numero, $texte);
        }
    }

    /** « mar. 17/11 à 9h00 », heure locale. */
    private function quand(Reservation $r): string
    {
        $debut = $r->period()->start->setTimezone(new \DateTimeZone($this->timezone));
        $jours = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

        return sprintf('%s %s à %sh%s', $jours[(int) $debut->format('N') - 1], $debut->format('d/m'), $debut->format('G'), $debut->format('i'));
    }
}
