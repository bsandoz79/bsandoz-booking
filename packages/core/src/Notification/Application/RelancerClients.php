<?php

declare(strict_types=1);

namespace Bsandoz\Core\Notification\Application;

use Bsandoz\Core\Admin\Domain\Port\SettingRepository;
use Bsandoz\Core\Auth\Domain\Port\UserRepository;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Booking\Domain\Model\ReservationStatus;
use Bsandoz\Core\Booking\Domain\Port\ReservationRepository;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Notification\Domain\Model\NotificationEnvoyee;
use Bsandoz\Core\Notification\Domain\Port\JournalNotifications;
use Bsandoz\Core\Notification\Domain\Port\Notifier;
use Bsandoz\Core\Shared\Domain\Clock;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\IdGenerator;
use Bsandoz\Core\Shared\Domain\NotFound;

/**
 * Relance automatique (cron) des clients qui ne sont pas revenus : dernière prestation faite il y a plus de `jours`
 * jours et aucun rendez-vous à venir. Un seul e-mail par période d'absence (rattaché à la dernière prestation, noté dans
 * le journal des notifications) ; chaque e-mail contient un lien de désinscription, et un client désinscrit n'est plus
 * relancé. Désactivée par défaut ; envoi en journée seulement (heure locale), au plus MAX_PAR_PASSAGE e-mails à la fois.
 */
final class RelancerClients
{
    public const CLE = 'relance';
    public const JOURS_PAR_DEFAUT = 90;
    private const MAX_PAR_PASSAGE = 30;
    private const HEURE_DEBUT = 10;
    private const HEURE_FIN = 18;

    public function __construct(
        private ReservationRepository $reservations,
        private UserRepository $users,
        private JournalNotifications $journal,
        private Notifier $notifier,
        private SettingRepository $settings,
        private SettingsProvider $reglagesAgenda,
        private IdGenerator $ids,
        private Clock $clock,
        private string $secret,
    ) {
    }

    /** @return array{actif: bool, jours: int, desinscrits: int} */
    public function reglage(): array
    {
        $r = $this->brut();

        return ['actif' => $r['actif'], 'jours' => $r['jours'], 'desinscrits' => count($r['desinscrits'])];
    }

    /**
     * @param array<string, mixed> $data {actif, jours}
     * @return array{actif: bool, jours: int, desinscrits: int}
     * @throws DomainError délai hors de 30 à 730 jours
     */
    public function changer(array $data): array
    {
        $jours = $data['jours'] ?? self::JOURS_PAR_DEFAUT;
        if (!is_int($jours) || $jours < 30 || $jours > 730) {
            throw new DomainError('Délai de relance : entre 30 et 730 jours.');
        }
        $r = $this->brut();
        $this->settings->save(self::CLE, ['actif' => ($data['actif'] ?? false) === true, 'jours' => $jours, 'desinscrits' => $r['desinscrits']]);

        return $this->reglage();
    }

    /** @return int nombre d'e-mails envoyés */
    public function __invoke(): int
    {
        $r = $this->brut();
        $now = $this->clock->now();
        $heure = (int) $now->setTimezone($this->reglagesAgenda->timezone())->format('G');
        if (!$r['actif'] || $heure < self::HEURE_DEBUT || $heure >= self::HEURE_FIN) {
            return 0;
        }

        $limite = $now->modify(sprintf('-%d days', $r['jours']));
        /** @var array<string, array{derniere: ?Reservation, prevu: bool}> $parClient */
        $parClient = [];
        foreach ($this->reservations->between($now->modify('-3 years'), $now->modify('+2 years')) as $res) {
            $c = $parClient[$res->userId()] ?? ['derniere' => null, 'prevu' => false];
            if ($res->status() === ReservationStatus::Done && ($c['derniere'] === null || $res->period()->start > $c['derniere']->period()->start)) {
                $c['derniere'] = $res;
            }
            if (in_array($res->status(), [ReservationStatus::Confirmed, ReservationStatus::PendingPayment], true) && $res->period()->start >= $now) {
                $c['prevu'] = true;
            }
            $parClient[$res->userId()] = $c;
        }

        $envoyes = 0;
        foreach ($parClient as $userId => $c) {
            $derniere = $c['derniere'];
            if ($envoyes >= self::MAX_PAR_PASSAGE) {
                break;
            }
            if ($derniere === null || $c['prevu'] || $derniere->period()->start >= $limite || in_array($userId, $r['desinscrits'], true)) {
                continue;
            }
            // Une relance par période d'absence : rattachée à la dernière prestation faite.
            if ($this->journal->dejaEnvoyee(NotificationEnvoyee::RELANCE, $derniere->id())) {
                continue;
            }
            try {
                $user = $this->users->get($userId);
            } catch (NotFound) {
                continue;
            }
            if (!str_contains($user->email(), '@') || str_ends_with($user->email(), '@invalid')) {
                continue;
            }

            $this->notifier->send($user->email(), 'customer_reminder', [
                'firstname' => $user->firstname(),
                'derniereVisite' => $derniere->period()->start->format(DATE_ATOM),
                'desinscription' => sprintf('u=%s&s=%s', rawurlencode($userId), $this->signature($userId)),
            ]);
            $this->journal->enregistrer(new NotificationEnvoyee($this->ids->generate(), NotificationEnvoyee::RELANCE, $derniere->id(), $now));
            ++$envoyes;
        }

        return $envoyes;
    }

    /**
     * Lien de désinscription de l'e-mail : le client ne sera plus relancé.
     *
     * @throws NotFound lien invalide
     */
    public function desinscrire(string $userId, string $signature): void
    {
        if ($userId === '' || !hash_equals($this->signature($userId), $signature)) {
            throw new NotFound('Lien de désinscription invalide.');
        }
        $r = $this->brut();
        if (!in_array($userId, $r['desinscrits'], true)) {
            $r['desinscrits'][] = $userId;
            $this->settings->save(self::CLE, $r);
        }
    }

    private function signature(string $userId): string
    {
        return substr(hash_hmac('sha256', 'relance|' . $userId, $this->secret), 0, 32);
    }

    /** @return array{actif: bool, jours: int, desinscrits: list<string>} */
    private function brut(): array
    {
        $r = $this->settings->get(self::CLE) ?? [];
        $jours = $r['jours'] ?? self::JOURS_PAR_DEFAUT;
        $desinscrits = $r['desinscrits'] ?? [];

        return [
            'actif' => ($r['actif'] ?? false) === true,
            'jours' => is_int($jours) ? $jours : self::JOURS_PAR_DEFAUT,
            'desinscrits' => is_array($desinscrits) ? array_values(array_filter($desinscrits, 'is_string')) : [],
        ];
    }
}
