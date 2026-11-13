<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Notification;

use Bsandoz\Core\Notification\Application\DemandeAvis;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Tests\Double\InMemorySettingRepository;
use PHPUnit\Framework\TestCase;

final class DemandeAvisTest extends TestCase
{
    public function testDesactiveeTantQuIlNYAPasDeLien(): void
    {
        $avis = new DemandeAvis(new InMemorySettingRepository());

        self::assertSame(['actif' => false, 'lien' => ''], $avis->reglage());
        self::assertNull($avis->lien());
    }

    public function testLienEnregistrePuisDesactive(): void
    {
        $avis = new DemandeAvis(new InMemorySettingRepository());

        self::assertSame(['actif' => true, 'lien' => 'https://g.page/r/exemple/review'], $avis->changer(['lien' => ' https://g.page/r/exemple/review ']));
        self::assertSame('https://g.page/r/exemple/review', $avis->lien());

        $avis->changer(['actif' => false, 'lien' => 'https://g.page/r/exemple/review']);
        self::assertNull($avis->lien());
    }

    public function testLienInvalideRefuse(): void
    {
        $this->expectException(DomainError::class);
        (new DemandeAvis(new InMemorySettingRepository()))->changer(['lien' => 'javascript:alert(1)']);
    }
}
