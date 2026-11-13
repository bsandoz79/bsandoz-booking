<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Facturation;

use Bsandoz\Core\Facturation\Application\InfosFacturation;
use Bsandoz\Core\Facturation\Domain\Model\Facture;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Tests\Double\InMemorySettingRepository;
use PHPUnit\Framework\TestCase;

final class FactureTest extends TestCase
{
    public function testNumerotationChronologiqueParAnnee(): void
    {
        self::assertSame('F-2026-0001', Facture::numeroSuivant(null, 2026));
        self::assertSame('F-2026-0008', Facture::numeroSuivant('F-2026-0007', 2026));
        self::assertSame('F-2027-0001', Facture::numeroSuivant('F-2026-0042', 2027), 'nouvelle année : on repart à 1');
        self::assertSame('F-2026-10000', Facture::numeroSuivant('F-2026-9999', 2026));
    }

    public function testInformationsDuVendeurACompleterPuisEnregistrees(): void
    {
        $infos = new InfosFacturation(new InMemorySettingRepository());
        self::assertSame('[à compléter]', $infos->vendeur()['siret']);
        self::assertSame('TVA non applicable, art. 293 B du CGI', $infos->vendeur()['mentionTva']);

        $vendeur = $infos->changer(['nom' => 'Perfect Clean', 'adresse' => '1 rue X, Abbeville', 'siret' => '123 456 789 00012', 'mentionTva' => '', 'email' => 'contact@bsandoz.fr', 'telephone' => '01 02 03 04 05']);
        self::assertSame(['Perfect Clean', '12345678900012', 'TVA non applicable, art. 293 B du CGI'], [$vendeur['nom'], $vendeur['siret'], $vendeur['mentionTva']]);

        $this->expectException(DomainError::class);
        $infos->changer(['siret' => '123']);
    }
}
