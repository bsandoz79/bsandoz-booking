<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Catalog;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Model\Tarif;
use Bsandoz\Core\Catalog\Domain\Service\PrixCalculator;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use PHPUnit\Framework\TestCase;

final class PrixCalculatorTest extends TestCase
{
    public function testPrixParVarianteOptionsFraisEtAcompte(): void
    {
        $poils = new Option('poils', 'Poils d\'animaux', Money::cents(1500), 30);
        $p = new Prestation('int', 'Nettoyage intérieur', Money::cents(7900), 120);
        $p->addTarif(new Tarif('suv', Money::cents(9900), 150));
        $p->addOption($poils);

        $devis = (new PrixCalculator())->calculer($p, 'suv', [$poils], Money::cents(1200), 30, null);

        self::assertSame(12600, $devis->total->cents);
        self::assertSame(3780, $devis->deposit->cents);
        self::assertSame(180, $devis->durationMin);
        self::assertCount(3, $devis->lines);
    }

    public function testRefuseUneOptionNonAutorisee(): void
    {
        $p = new Prestation('ext', 'Extérieur', Money::cents(5900), 90);
        $this->expectException(DomainError::class);
        (new PrixCalculator())->calculer($p, null, [new Option('x', 'Moteur', Money::cents(2000), 30)], Money::zero(), 30, null);
    }

    public function testPlusieursVehiculesMemeFormuleEtOptionsParVehicule(): void
    {
        $poils = new Option('poils', 'Poils d\'animaux', Money::cents(1000), 30);
        $sale = new Option('sale', 'Très sale', Money::cents(1000), 20);
        $p = new Prestation('int', 'Éclat', Money::cents(2900), 90);
        $p->addOption($poils);
        $p->addOption($sale);

        // 3 véhicules : poils sur 2 d'entre eux, très sale sur 1 ; déplacement compté une fois.
        $devis = (new PrixCalculator())->calculer($p, null, [$poils, $sale, $poils], Money::cents(500), 30, null, 3);

        self::assertSame([['Éclat × 3', 8700], ['Poils d\'animaux × 2', 2000], ['Très sale', 1000], ['Frais de déplacement', 500]],
            array_map(static fn (array $l): array => [$l['label'], $l['price']->cents], $devis->lines));
        self::assertSame(12200, $devis->total->cents);
        self::assertSame(90 * 3 + 30 * 2 + 20, $devis->durationMin);
    }

    public function testRemiseParVehiculeSupplementaire(): void
    {
        $p = new Prestation('phares', 'Phares', Money::cents(4500), 90);
        $p->changerRemiseUniteSupplementaire(500);

        // 45 € le premier, 40 € chacun des suivants.
        self::assertSame(4500, (new PrixCalculator())->calculer($p, null, [], Money::zero(), null, null, 1)->total->cents);
        $devis = (new PrixCalculator())->calculer($p, null, [], Money::zero(), null, null, 3);
        self::assertSame([['Phares × 3', 12500]], array_map(static fn (array $l): array => [$l['label'], $l['price']->cents], $devis->lines));

        // Remise plus grande que le prix : jamais de prix négatif.
        $p->changerRemiseUniteSupplementaire(9000);
        self::assertSame(4500, (new PrixCalculator())->calculer($p, null, [], Money::zero(), null, null, 2)->total->cents);
    }

    public function testRemiseNegativeRefusee(): void
    {
        $this->expectException(\Bsandoz\Core\Shared\Domain\DomainError::class);
        (new Prestation('p', 'P', Money::cents(100), 10))->changerRemiseUniteSupplementaire(-1);
    }

    public function testUneOptionAuPlusUneFoisParVehicule(): void
    {
        $poils = new Option('poils', 'Poils', Money::cents(1000), 30);
        $p = new Prestation('int', 'Éclat', Money::cents(2900), 90);
        $p->addOption($poils);
        $this->expectException(DomainError::class);
        (new PrixCalculator())->calculer($p, null, [$poils, $poils], Money::zero(), 30, null, 1);
    }

    public function testQuantiteLimitee(): void
    {
        $this->expectException(DomainError::class);
        (new PrixCalculator())->calculer(new Prestation('int', 'Éclat', Money::cents(2900), 90), null, [], Money::zero(), 30, null, 6);
    }

    /** @return array{Prestation, Prestation, Prestation, Option} formule complète (intérieur + extérieur, 15 € de remise), deux formules et une option */
    private static function formuleComplete(): array
    {
        $phares = new Option('phares', 'Rénovation des phares', Money::cents(3900), 45);
        $complete = new Prestation('complete', 'Formule complète', Money::zero(), 1, categoryId: 'complete');
        $complete->changerComposition(['interieur', 'exterieur'], 1500);
        $complete->addOption($phares);
        $poils = new Option('poils', 'Poils d\'animaux', Money::cents(1000), 30);
        $interieur = new Prestation('int-sig', 'Intérieur Signature', Money::cents(6900), 150, categoryId: 'interieur');
        $interieur->addOption($poils);
        $exterieur = new Prestation('ext-ecl', 'Extérieur Éclat', Money::cents(2500), 90, categoryId: 'exterieur');

        return [$complete, $interieur, $exterieur, $phares];
    }

    public function testFormuleCombineeSommeMoinsLaRemiseEtOptionsDeChaqueCote(): void
    {
        [$complete, $interieur, $exterieur, $phares] = self::formuleComplete();
        $poils = new Option('poils', 'Poils d\'animaux', Money::cents(1000), 30);

        // Ordre de choix indifférent : les lignes suivent l'ordre de la formule.
        $devis = (new PrixCalculator())->calculer($complete, null, [$phares, $poils], Money::zero(), null, null, 1, [$exterieur, $interieur]);

        self::assertSame(6900 + 2500 - 1500 + 3900 + 1000, $devis->total->cents);
        self::assertSame(150 + 90 + 45 + 30, $devis->durationMin);
        self::assertSame(['Intérieur Signature', 'Extérieur Éclat', 'Remise Formule complète', 'Rénovation des phares', 'Poils d\'animaux'], array_column($devis->lines, 'label'));
        self::assertTrue($devis->lines[2]['deduction'] ?? false);
        self::assertSame(1500, $devis->lines[2]['price']->cents);
    }

    public function testFormuleCombineeExigeUnChoixParCategorie(): void
    {
        [$complete, $interieur, $exterieur] = self::formuleComplete();
        $calcul = new PrixCalculator();
        foreach ([[], [$interieur], [$interieur, $interieur], [$interieur, $exterieur, $complete]] as $choix) {
            try {
                $calcul->calculer($complete, null, [], Money::zero(), null, null, 1, $choix);
                self::fail('choix incomplet accepté : ' . count($choix));
            } catch (DomainError) {
            }
        }
        $this->expectException(DomainError::class);
        $calcul->calculer($interieur, null, [], Money::zero(), null, null, 1, [$exterieur]);
    }

    public function testRemiseDeLaFormuleJamaisPlusQueLaSomme(): void
    {
        [$complete, $interieur, $exterieur] = self::formuleComplete();
        $complete->changerComposition(['interieur', 'exterieur'], 50000);

        self::assertSame(0, (new PrixCalculator())->calculer($complete, null, [], Money::zero(), null, null, 1, [$interieur, $exterieur])->total->cents);
    }
}
