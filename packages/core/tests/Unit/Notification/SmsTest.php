<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Notification;

use Bsandoz\Core\Notification\Domain\Service\NumeroMobile;
use Bsandoz\Core\Notification\Infrastructure\Sms\AucunSms;
use Bsandoz\Core\Notification\Infrastructure\Sms\BrevoSms;
use Bsandoz\Core\Notification\Infrastructure\Sms\FabriqueEnvoiSms;
use Bsandoz\Core\Notification\Infrastructure\Sms\PasserelleAndroidSms;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

final class SmsTest extends TestCase
{
    public function testNumeroMobileAuFormatInternational(): void
    {
        self::assertSame('+33612345678', NumeroMobile::international('06 12 34 56 78'));
        self::assertSame('+33712345678', NumeroMobile::international('+33 7 12 34 56 78'));
        self::assertSame('+33612345678', NumeroMobile::international('0033612345678'));
        self::assertSame('+32470123456', NumeroMobile::international('+32 470 12 34 56'), 'autre pays gardé');
        self::assertNull(NumeroMobile::international('01 02 03 04 05'), 'un fixe ne reçoit pas de SMS');
        self::assertNull(NumeroMobile::international('abc'));
    }

    public function testAucunFournisseurParDefaut(): void
    {
        $http = new MockHttpClient();
        self::assertInstanceOf(AucunSms::class, FabriqueEnvoiSms::creer($http, null, '', '', '', '', '', ''));
        self::assertFalse(FabriqueEnvoiSms::creer($http, null, '', '', '', '', '', '')->actif());
        self::assertInstanceOf(BrevoSms::class, FabriqueEnvoiSms::creer($http, null, 'brevo', 'PERFCLEAN', 'cle', '', '', ''));
        self::assertInstanceOf(PasserelleAndroidSms::class, FabriqueEnvoiSms::creer($http, null, 'Android', '', '', 'https://api.sms-gate.app/3rdparty/v1', 'u', 'p'));
    }

    public function testBrevoEnvoieUnSmsTransactionnel(): void
    {
        $requetes = [];
        $http = new MockHttpClient(function (string $methode, string $url, array $options) use (&$requetes) {
            $requetes[] = [$methode, $url, json_decode($options['body'], true)];

            return new MockResponse('{}', ['http_code' => 201]);
        });
        (new BrevoSms($http, 'cle', 'PERFCLEAN'))->envoyer('+33612345678', 'Bonjour');

        self::assertSame(['POST', 'https://api.brevo.com/v3/transactionalSMS/sms', ['sender' => 'PERFCLEAN', 'recipient' => '33612345678', 'content' => 'Bonjour', 'type' => 'transactional']], $requetes[0]);
    }

    public function testUnEchecNeBloqueJamais(): void
    {
        $http = new MockHttpClient(new MockResponse('', ['error' => 'réseau coupé']));
        (new PasserelleAndroidSms($http, 'https://telephone.test', 'u', 'p'))->envoyer('+33612345678', 'Bonjour');
        $this->addToAssertionCount(1);
    }

    public function testSmsDeConfirmationSeulementAvecUnFournisseur(): void
    {
        $users = new \Bsandoz\Core\Tests\Double\InMemoryUserRepository();
        $users->save(new \Bsandoz\Core\Auth\Domain\Model\User('u-1', 'camille@example.test', 'Camille', 'Martin', '06 12 34 56 78'));
        $prestations = new \Bsandoz\Core\Tests\Double\InMemoryPrestationRepository(new \Bsandoz\Core\Catalog\Domain\Model\Prestation('p', 'Intérieur', \Bsandoz\Core\Shared\Domain\Money::cents(6900), 60));
        $reservation = new \Bsandoz\Core\Booking\Domain\Model\Reservation('r-1', 'u-1', 'p', null, [],
            new \Bsandoz\Core\Shared\Domain\TimeRange(new \DateTimeImmutable('2026-11-17T08:00:00Z'), new \DateTimeImmutable('2026-11-17T09:00:00Z')),
            'adresse', 50.0, 1.8, \Bsandoz\Core\Shared\Domain\Money::cents(6900), \Bsandoz\Core\Shared\Domain\Money::zero(), \Bsandoz\Core\Shared\Domain\Money::zero());
        $sms = new class implements \Bsandoz\Core\Notification\Domain\Port\EnvoiSms {
            /** @var list<array{string, string}> */
            public array $envoyes = [];
            public bool $estActif = true;
            public function actif(): bool { return $this->estActif; }
            public function envoyer(string $numero, string $texte): void { $this->envoyes[] = [$numero, $texte]; }
        };
        $notifications = new \Bsandoz\Core\Booking\Application\NotificationsReservation(new \Bsandoz\Core\Tests\Double\RecordingNotifier(), $users, $prestations, new \Bsandoz\Core\Notification\Domain\Service\IcsGenerator(), 'Perfect Clean', null, null, 'Europe/Paris', $sms);

        $notifications->confirmee($reservation, 'jeton');
        self::assertSame([['+33612345678', 'Perfect Clean : votre rendez-vous du mar. 17/11 à 9h00 est confirmé. Détails et gestion dans l\'e-mail reçu.']], $sms->envoyes);

        $sms->estActif = false;
        $notifications->rappel($reservation, 'jeton');
        self::assertCount(1, $sms->envoyes, 'aucun fournisseur : aucun SMS');
    }
}
