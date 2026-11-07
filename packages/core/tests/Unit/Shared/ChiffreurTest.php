<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Shared;

use Bsandoz\Core\Shared\Infrastructure\Security\Chiffreur;
use PHPUnit\Framework\TestCase;

final class ChiffreurTest extends TestCase
{
    private const CLE = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';

    public function testChiffreEtDechiffre(): void
    {
        $chiffreur = new Chiffreur(self::CLE);
        $chiffre = $chiffreur->chiffrer('12 rue de l\'Exemple, 80000 Amiens');

        self::assertStringStartsWith('enc:v1:', $chiffre);
        self::assertStringNotContainsString('Amiens', $chiffre);
        self::assertSame('12 rue de l\'Exemple, 80000 Amiens', $chiffreur->dechiffrer($chiffre));
    }

    public function testDeuxChiffrementsDuMemeTexteDifferent(): void
    {
        $chiffreur = new Chiffreur(self::CLE);

        self::assertNotSame($chiffreur->chiffrer('0600000000'), $chiffreur->chiffrer('0600000000'), 'nonce aléatoire');
    }

    public function testTexteVideEtUnicode(): void
    {
        $chiffreur = new Chiffreur(self::CLE);

        self::assertSame('', $chiffreur->dechiffrer($chiffreur->chiffrer('')));
        self::assertSame('Rue de l’Église — Æ ø 🚗', $chiffreur->dechiffrer($chiffreur->chiffrer('Rue de l’Église — Æ ø 🚗')));
    }

    public function testValeurEnClairAnterieureRendueTelleQuelle(): void
    {
        self::assertSame('ancienne adresse', (new Chiffreur(self::CLE))->dechiffrer('ancienne adresse'));
    }

    public function testMauvaiseCleRefusee(): void
    {
        $chiffre = (new Chiffreur(self::CLE))->chiffrer('secret');

        $this->expectException(\RuntimeException::class);
        (new Chiffreur(Chiffreur::nouvelleCle()))->dechiffrer($chiffre);
    }

    public function testDonneeAltereeRefusee(): void
    {
        $chiffreur = new Chiffreur(self::CLE);
        $chiffre = $chiffreur->chiffrer('secret');
        $altere = substr($chiffre, 0, -2) . (str_ends_with($chiffre, 'A=') ? 'B=' : 'A=');

        $this->expectException(\RuntimeException::class);
        $chiffreur->dechiffrer($altere);
    }

    public function testCleMalFormee(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        new Chiffreur('trop-courte');
    }

    public function testSansCleLeChiffrementEchoueAvecUnMessageClair(): void
    {
        $this->expectException(\LogicException::class);
        $this->expectExceptionMessage('BSANDOZ_ENCRYPTION_KEY');
        (new Chiffreur(null))->chiffrer('secret');
    }

    public function testNouvelleCle(): void
    {
        $cle = Chiffreur::nouvelleCle();

        self::assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $cle);
        self::assertNotSame($cle, Chiffreur::nouvelleCle());
    }
}
