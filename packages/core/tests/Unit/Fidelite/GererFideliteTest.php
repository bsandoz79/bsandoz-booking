<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Fidelite;

use Bsandoz\Core\Fidelite\Application\GererFidelite;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryCartesFidelite;
use Bsandoz\Core\Tests\Double\InMemorySettingRepository;
use PHPUnit\Framework\TestCase;

/** Carte de fidélité : 4 prestations réalisées, 20 % sur la suivante (règle par défaut, modifiable par le pro). */
final class GererFideliteTest extends TestCase
{
    private GererFidelite $fidelite;

    protected function setUp(): void
    {
        $this->fidelite = new GererFidelite(new InMemoryCartesFidelite(), new InMemorySettingRepository(), new FrozenClock('2026-11-12 10:00'));
    }

    public function testCarteVidePuisTamponsJusquALaRemise(): void
    {
        self::assertSame(['actif' => true, 'tampons' => 0, 'tamponsRequis' => 4, 'remisePercent' => 20, 'remiseDisponible' => false], $this->fidelite->carte('u-1'));

        for ($i = 0; $i < 3; ++$i) {
            $this->fidelite->tamponner('u-1');
        }
        self::assertSame(0, $this->fidelite->utiliserRemise('u-1', Money::cents(6900))->cents, 'pas encore pleine');

        $this->fidelite->tamponner('u-1');
        self::assertTrue($this->fidelite->carte('u-1')['remiseDisponible']);
        self::assertSame(1380, $this->fidelite->utiliserRemise('u-1', Money::cents(6900))->cents, '20 % de 69 €');
        self::assertSame(0, $this->fidelite->carte('u-1')['tampons'], 'la carte repart');
    }

    public function testRemiseRenduePuisReprise(): void
    {
        $this->fidelite->ajuster('u-1', 4);
        $this->fidelite->utiliserRemise('u-1', Money::cents(1000));
        $this->fidelite->rendreRemise('u-1');
        self::assertTrue($this->fidelite->carte('u-1')['remiseDisponible'], 'réservation annulée : carte de nouveau pleine');
        $this->fidelite->reprendreRemise('u-1');
        self::assertSame(0, $this->fidelite->carte('u-1')['tampons']);
    }

    public function testAjustementParLeProJamaisSousZero(): void
    {
        self::assertSame(2, $this->fidelite->ajuster('u-1', 2)['tampons']);
        self::assertSame(0, $this->fidelite->ajuster('u-1', -5)['tampons']);
        $this->expectException(DomainError::class);
        $this->fidelite->ajuster('u-1', 0);
    }

    public function testRegleModifieeOuDesactivee(): void
    {
        $this->fidelite->modifierRegle(['actif' => true, 'tamponsRequis' => 2, 'remisePercent' => 10]);
        $this->fidelite->tamponner('u-1');
        $this->fidelite->tamponner('u-1');
        self::assertSame(500, $this->fidelite->utiliserRemise('u-1', Money::cents(5000))->cents);

        $this->fidelite->modifierRegle(['actif' => false, 'tamponsRequis' => 2, 'remisePercent' => 10]);
        $this->fidelite->tamponner('u-1');
        self::assertSame(0, $this->fidelite->carte('u-1')['tampons'], 'désactivée : pas de tampon');
    }

    public function testRegleInvalideRefusee(): void
    {
        $this->expectException(DomainError::class);
        $this->fidelite->modifierRegle(['actif' => true, 'tamponsRequis' => 0, 'remisePercent' => 20]);
    }
}
