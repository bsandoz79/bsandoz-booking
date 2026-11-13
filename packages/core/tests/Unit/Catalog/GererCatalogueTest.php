<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Catalog;

use Bsandoz\Core\Catalog\Application\GererCatalogue;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Tests\Double\InMemoryOptionRepository;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

final class GererCatalogueTest extends TestCase
{
    private InMemoryPrestationRepository $prestations;
    private InMemoryOptionRepository $options;
    private GererCatalogue $catalogue;

    protected function setUp(): void
    {
        $this->prestations = new InMemoryPrestationRepository();
        $this->options = new InMemoryOptionRepository();
        $this->catalogue = new GererCatalogue($this->prestations, $this->options, new SequenceIdGenerator('c'));
    }

    /**
     * @param list<string> $optionIds
     * @return array<string, mixed>
     */
    private static function prestation(array $optionIds = []): array
    {
        return [
            'name' => ' Formule complète ', 'description' => 'Tout compris', 'basePriceCents' => 10000, 'baseDurationMin' => 120,
            'active' => true, 'categoryId' => 'cat-1', 'position' => 2, 'occupePlage' => true,
            'tarifs' => ['v-petit' => ['priceCents' => 9000, 'durationMin' => 100], 'v-grand' => ['priceCents' => 13000, 'durationMin' => 150]],
            'optionIds' => $optionIds,
        ];
    }

    public function testCreerUneOptionPuisUnePrestation(): void
    {
        $option = $this->catalogue->enregistrerOption(['name' => 'Option', 'description' => 'En plus', 'priceCents' => 1500, 'durationMin' => 30]);
        $prestation = $this->catalogue->enregistrerPrestation(self::prestation([$option['id']]));

        self::assertSame('c-1', $option['id']);
        self::assertSame('c-2', $prestation['id']);
        self::assertSame('Formule complète', $prestation['name'], 'nom nettoyé');
        self::assertTrue($prestation['occupePlage']);
        self::assertNull($prestation['badge']);

        $avecBadge = $this->catalogue->enregistrerPrestation(['badge' => ' Le plus choisi '] + self::prestation(), 'c-2');
        self::assertSame('Le plus choisi', $avecBadge['badge'], 'mise en avant, espaces retirés');
        self::assertNull($this->catalogue->enregistrerPrestation(['badge' => ''] + self::prestation(), 'c-2')['badge'], 'vide : retirée');
        self::assertSame(['priceCents' => 13000, 'durationMin' => 150], $prestation['tarifs']['v-grand']);
        self::assertSame(['c-1'], $prestation['optionIds']);
        self::assertSame(13000, $this->prestations->get('c-2')->priceFor('v-grand')->cents, 'tarif utilisé par les devis');
    }

    public function testModifierUnePrestationRemplaceTarifsEtOptions(): void
    {
        $id = $this->catalogue->enregistrerPrestation(self::prestation())['id'];
        $data = self::prestation();
        $data['tarifs'] = ['v-unique' => ['priceCents' => 8000, 'durationMin' => 90]];
        $data['basePriceCents'] = 9500;

        $modifiee = $this->catalogue->enregistrerPrestation($data, $id);

        self::assertSame(['v-unique'], array_keys($modifiee['tarifs']));
        self::assertSame(9500, $modifiee['basePriceCents']);
        self::assertCount(1, $this->catalogue->lister()['prestations'], 'pas de doublon');
    }

    public function testDesactiverUnePrestation(): void
    {
        $id = $this->catalogue->enregistrerPrestation(self::prestation())['id'];

        $this->catalogue->desactiverPrestation($id);

        self::assertFalse($this->catalogue->lister()['prestations'][0]['active'], 'reste visible dans l\'espace pro');
        self::assertSame([], $this->prestations->allActive(), 'retirée du catalogue public');
    }

    public function testModifierUneOption(): void
    {
        $id = $this->catalogue->enregistrerOption(['name' => 'Option', 'priceCents' => 1500, 'durationMin' => 30])['id'];

        $this->catalogue->enregistrerOption(['name' => 'Option renommée', 'priceCents' => 2000, 'durationMin' => 20, 'active' => false], $id);

        $option = $this->options->get($id);
        self::assertSame('Option renommée', $option->name);
        self::assertSame(2000, $option->price->cents);
        self::assertFalse($option->active);
    }

    public function testOptionInconnueDansUnePrestation(): void
    {
        $this->expectException(NotFound::class);
        $this->catalogue->enregistrerPrestation(self::prestation(['inconnue']));
    }

    public function testPrestationInconnue(): void
    {
        $this->expectException(NotFound::class);
        $this->catalogue->enregistrerPrestation(self::prestation(), 'inconnue');
    }

    /** @return iterable<string, array{string, mixed}> */
    public static function donneesInvalides(): iterable
    {
        yield 'nom vide' => ['name', '  '];
        yield 'prix négatif' => ['basePriceCents', -1];
        yield 'prix non entier' => ['basePriceCents', '100'];
        yield 'durée nulle' => ['baseDurationMin', 0];
        yield 'tarif sans durée' => ['tarifs', ['v' => ['priceCents' => 100, 'durationMin' => 0]]];
        yield 'tarifs mal formés' => ['tarifs', 'v'];
        yield 'options mal formées' => ['optionIds', [1]];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('donneesInvalides')]
    public function testDonneesInvalides(string $key, mixed $value): void
    {
        $data = self::prestation();
        $data[$key] = $value;

        $this->expectException(DomainError::class);
        $this->catalogue->enregistrerPrestation($data);
    }

    public function testOptionSansNom(): void
    {
        $this->expectException(DomainError::class);
        $this->catalogue->enregistrerOption(['name' => '', 'priceCents' => 100, 'durationMin' => 10]);
    }

    public function testNouvelOrdreDesPrestationsEtDesOptions(): void
    {
        $a = $this->catalogue->enregistrerOption(['name' => 'Désodorisant', 'priceCents' => 400, 'durationMin' => 0]);
        $b = $this->catalogue->enregistrerOption(['name' => 'Poils', 'priceCents' => 1000, 'durationMin' => 30]);
        $c = $this->catalogue->enregistrerOption(['name' => 'Très sale', 'priceCents' => 1000, 'durationMin' => 30]);
        $p1 = $this->catalogue->enregistrerPrestation(['name' => 'Éclat', 'basePriceCents' => 2900, 'baseDurationMin' => 90, 'position' => 0]);
        $p2 = $this->catalogue->enregistrerPrestation(['name' => 'Signature', 'basePriceCents' => 6900, 'baseDurationMin' => 150, 'position' => 1]);

        // Le désodorisant passe en troisième position, Signature avant Éclat.
        $this->catalogue->reordonner(['options' => [$b['id'], $c['id'], $a['id']], 'prestations' => [$p2['id'], $p1['id']]]);

        $liste = $this->catalogue->lister();
        self::assertSame(['Poils', 'Très sale', 'Désodorisant'], array_column($liste['options'], 'name'));
        self::assertSame([1, 0], [$this->prestations->get((string) $p1['id'])->position(), $this->prestations->get((string) $p2['id'])->position()]);
        self::assertSame(1000, $this->options->get((string) $b['id'])->price->cents, 'le reste de l\'option est inchangé');
    }

    public function testOrdreAvecUnIdentifiantInconnu(): void
    {
        $this->expectException(\Bsandoz\Core\Shared\Domain\NotFound::class);
        $this->catalogue->reordonner(['options' => ['inconnue']]);
    }
}
