<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Application;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Catalog\Domain\Port\PrestationRepository;
use Bsandoz\Core\Notification\Domain\Port\Notifier;
use Bsandoz\Core\Notification\Domain\Service\IcsGenerator;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Mails d'une réservation, au client et au pro (si son adresse est configurée).
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
    ) {
    }

    /** Rendez-vous confirmé (acompte payé ou sans acompte) : confirmation avec .ics au client, alerte au pro. */
    public function confirmee(Reservation $reservation, string $manageToken): void
    {
        [$user, $context] = $this->contexte($reservation);
        $this->notifier->send($user->email(), 'booking_confirmed', $context + ['manageToken' => $manageToken], [$this->piece($reservation, $context)]);
        $this->auPro('pro_new_booking', $context);
    }

    public function annulee(Reservation $reservation, bool $refundable): void
    {
        [$user, $context] = $this->contexte($reservation);
        $this->notifier->send($user->email(), 'booking_cancelled', $context + ['refundable' => $refundable]);
        $this->auPro('pro_booking_cancelled', $context + ['refundable' => $refundable]);
    }

    public function deplacee(Reservation $reservation, \DateTimeImmutable $previousStart): void
    {
        [$user, $context] = $this->contexte($reservation);
        $context['previousStart'] = self::iso($previousStart);
        $this->notifier->send($user->email(), 'booking_moved', $context, [$this->piece($reservation, $context)]);
        $this->auPro('pro_booking_moved', $context);
    }

    public function rappel(Reservation $reservation, ?string $manageToken): void
    {
        [$user, $context] = $this->contexte($reservation);
        $this->notifier->send($user->email(), 'reminder', $context + ['manageToken' => $manageToken]);
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
            $prestation = $this->prestations->get($r->prestationId())->name();
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

    private static function iso(\DateTimeImmutable $date): string
    {
        return $date->setTimezone(new \DateTimeZone('UTC'))->format(DATE_ATOM);
    }
}
