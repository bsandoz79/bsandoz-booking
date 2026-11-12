<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Notification;

use Bsandoz\Core\Auth\Domain\Model\User;
use Bsandoz\Core\Booking\Application\NotificationsReservation;
use Bsandoz\Core\Booking\Domain\Model\Reservation;
use Bsandoz\Core\Notification\Application\GererAbonnementsPush;
use Bsandoz\Core\Notification\Application\NotifierProParPush;
use Bsandoz\Core\Notification\Domain\Model\AbonnementPush;
use Bsandoz\Core\Notification\Domain\Model\MessagePush;
use Bsandoz\Core\Notification\Domain\Model\ResultatPush;
use Bsandoz\Core\Notification\Domain\Service\IcsGenerator;
use Bsandoz\Core\Notification\Infrastructure\Push\WebPushEnvoi;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\TimeRange;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\FakeEnvoiPush;
use Bsandoz\Core\Tests\Double\InMemoryAbonnementsPush;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use Bsandoz\Core\Tests\Double\InMemoryUserRepository;
use Bsandoz\Core\Tests\Double\RecordingNotifier;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** Notifications push du pro : abonnement des appareils, envoi, nettoyage des abonnements expirés. */
final class PushTest extends TestCase
{
    private const ENDPOINT = 'https://push.example.test/abc';

    private InMemoryAbonnementsPush $abonnements;
    private FakeEnvoiPush $envoi;
    private GererAbonnementsPush $gerer;

    protected function setUp(): void
    {
        $this->abonnements = new InMemoryAbonnementsPush();
        $this->envoi = new FakeEnvoiPush();
        $this->gerer = new GererAbonnementsPush($this->abonnements, $this->envoi, new SequenceIdGenerator('push'), new FrozenClock('2026-11-12 10:00'));
    }

    public function testAbonnerPuisSeReabonnerRemplaceLAppareil(): void
    {
        $this->gerer->abonner('pro-1', self::ENDPOINT, 'BPubKey_-1', 'auth-1');
        $this->gerer->abonner('pro-1', self::ENDPOINT, 'BPubKey_-2', 'auth-2');

        self::assertCount(1, $this->abonnements->tous());
        self::assertSame('BPubKey_-2', $this->abonnements->tous()[0]->publicKey);
        self::assertSame('cle-publique', $this->gerer->clePublique());
    }

    /** @return iterable<string, array{string, string, string}> */
    public static function abonnementsInvalides(): iterable
    {
        yield 'endpoint non https' => ['http://push.example.test/x', 'cle', 'auth'];
        yield 'clé vide' => [self::ENDPOINT, '', 'auth'];
        yield 'clé non base64url' => [self::ENDPOINT, 'clé invalide', 'auth'];
    }

    #[DataProvider('abonnementsInvalides')]
    public function testRefuseUnAbonnementInvalide(string $endpoint, string $cle, string $auth): void
    {
        $this->expectException(DomainError::class);
        $this->gerer->abonner('pro-1', $endpoint, $cle, $auth);
    }

    public function testRefuseQuandLePushNEstPasConfigure(): void
    {
        $gerer = new GererAbonnementsPush($this->abonnements, new FakeEnvoiPush(false), new SequenceIdGenerator(), new FrozenClock('2026-11-12 10:00'));
        self::assertNull($gerer->clePublique());
        $this->expectException(DomainError::class);
        $gerer->abonner('pro-1', self::ENDPOINT, 'cle', 'auth');
    }

    public function testDesabonnerSeulementSonPropreAppareil(): void
    {
        $this->gerer->abonner('pro-1', self::ENDPOINT, 'cle', 'auth');
        $this->gerer->desabonner('autre', self::ENDPOINT);
        self::assertCount(1, $this->abonnements->tous());
        $this->gerer->desabonner('pro-1', self::ENDPOINT);
        self::assertSame([], $this->abonnements->tous());
    }

    public function testEnvoieATousLesAppareilsEtSupprimeLesExpires(): void
    {
        $this->gerer->abonner('pro-1', self::ENDPOINT, 'cle', 'auth');
        $this->gerer->abonner('pro-1', 'https://push.example.test/expire', 'cle', 'auth');
        $this->gerer->abonner('pro-1', 'https://push.example.test/panne', 'cle', 'auth');
        $this->envoi->reponses = ['https://push.example.test/expire' => ResultatPush::Expire, 'https://push.example.test/panne' => ResultatPush::Echec];

        $envoyes = (new NotifierProParPush($this->abonnements, $this->envoi))(new MessagePush('Titre', 'Texte'));

        self::assertSame(1, $envoyes);
        self::assertSame(
            [self::ENDPOINT, 'https://push.example.test/panne'],
            array_map(static fn (AbonnementPush $a): string => $a->endpoint, $this->abonnements->tous()),
            'expiré supprimé, panne passagère gardée',
        );
    }

    public function testNotifieLeProDUnNouveauRendezVousEnHeureLocale(): void
    {
        $this->gerer->abonner('pro-1', self::ENDPOINT, 'cle', 'auth');
        $users = new InMemoryUserRepository();
        $users->save(new User('u-1', 'camille@example.test', 'Camille', 'Martin', '0600000000'));
        $notifications = new NotificationsReservation(
            new RecordingNotifier(), $users, new InMemoryPrestationRepository(), new IcsGenerator(), 'Marque', null,
            new NotifierProParPush($this->abonnements, $this->envoi), 'Europe/Paris',
        );
        $debut = new \DateTimeImmutable('2026-11-10 08:30', new \DateTimeZone('UTC'));
        $r = new Reservation('r-1', 'u-1', 'p-1', null, [], new TimeRange($debut, $debut->modify('+1 hour')), 'adresse', 0.0, 0.0, Money::cents(100), Money::zero(), Money::zero());

        $notifications->confirmee($r, 'jeton');
        $notifications->annulee($r, true);

        self::assertCount(2, $this->envoi->envoyes);
        $message = $this->envoi->envoyes[0]['message'];
        self::assertSame('Nouveau rendez-vous', $message->title);
        self::assertSame('Camille Martin · mardi 10 novembre à 09h30', $message->body);
        self::assertSame('/pro', $message->url);
        self::assertSame('Rendez-vous annulé', $this->envoi->envoyes[1]['message']->title);
        self::assertSame('{"title":"Nouveau rendez-vous","body":"Camille Martin · mardi 10 novembre à 09h30","url":"/pro","tag":"rdv-r-1"}', $message->json());
    }

    public function testWebPushSansClesEstDesactive(): void
    {
        $envoi = new WebPushEnvoi('', '', 'mailto:pro@example.test');
        self::assertFalse($envoi->actif());
        self::assertNull($envoi->clePublique());
        self::assertSame(0, (new NotifierProParPush($this->abonnements, $envoi))(new MessagePush('T', 'B')));
    }
}
