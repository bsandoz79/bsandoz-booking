<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Admin;

use Bsandoz\Core\Admin\Application\GererContenuSite;
use Bsandoz\Core\Admin\Application\GererMedias;
use Bsandoz\Core\Admin\Infrastructure\Medias\DossierMedias;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Tests\Double\InMemorySettingRepository;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** Contenu modifiable du site (textes, listes) et photos envoyées par le pro. */
final class ContenuSiteTest extends TestCase
{
    private GererContenuSite $contenu;
    private string $dossier;
    private GererMedias $medias;

    protected function setUp(): void
    {
        $this->contenu = new GererContenuSite(new InMemorySettingRepository());
        $this->dossier = sys_get_temp_dir() . '/bsandoz-medias-' . bin2hex(random_bytes(4));
        $this->medias = new GererMedias(new DossierMedias($this->dossier));
    }

    protected function tearDown(): void
    {
        foreach (glob($this->dossier . '/*') ?: [] as $f) {
            unlink($f);
        }
        if (is_dir($this->dossier)) {
            rmdir($this->dossier);
        }
    }

    public function testVideTantQueRienNEstModifie(): void
    {
        self::assertSame([], $this->contenu->lire());
    }

    public function testEnregistreEtNettoieLesTextes(): void
    {
        $this->contenu->enregistrer([
            'coordonnees' => ['telephone' => '  06 00 00 00 00  '],
            'faq' => [['question' => 'Eau ?', 'reponse' => "Non.\r\nAutonome."]],
            'avis' => [['auteur' => 'Camille', 'note' => 5, 'publie' => true, 'photo' => null]],
        ]);

        self::assertSame([
            'coordonnees' => ['telephone' => '06 00 00 00 00'],
            'faq' => [['question' => 'Eau ?', 'reponse' => "Non.\nAutonome."]],
            'avis' => [['auteur' => 'Camille', 'note' => 5, 'publie' => true, 'photo' => null]],
        ], $this->contenu->lire());
    }

    /** @return iterable<string, array{array<mixed>}> */
    public static function contenusRefuses(): iterable
    {
        yield 'liste à la racine' => [['a', 'b']];
        yield 'nom de rubrique invalide' => [['mauvais nom' => 'x']];
        yield 'texte trop long' => [['t' => str_repeat('a', GererContenuSite::TEXTE_MAX + 1)]];
        yield 'trop imbriqué' => [['a' => ['b' => ['c' => ['d' => ['e' => ['f' => ['g' => 1]]]]]]]];
        yield 'trop volumineux' => [['l' => array_fill(0, 60, str_repeat('a', 4000))]];
    }

    /** @param array<mixed> $contenu */
    #[DataProvider('contenusRefuses')]
    public function testRefuseUnContenuInvalide(array $contenu): void
    {
        $this->expectException(DomainError::class);
        $this->contenu->enregistrer($contenu);
    }

    public function testEnvoieUnePhotoReconnueASonContenu(): void
    {
        $png = "\x89PNG\r\n\x1A\n" . str_repeat("\0", 20);
        $nom = $this->medias->envoyer($png);

        self::assertMatchesRegularExpression('/^[a-f0-9]{32}\.png$/', $nom);
        self::assertSame($png, file_get_contents($this->dossier . '/' . $nom));
        self::assertSame([$nom], $this->medias->lister());

        $this->medias->supprimer($nom);
        self::assertSame([], $this->medias->lister());
    }

    public function testReconnaitJpegEtWebp(): void
    {
        self::assertStringEndsWith('.jpg', $this->medias->envoyer("\xFF\xD8\xFF\xE0" . 'reste'));
        self::assertStringEndsWith('.webp', $this->medias->envoyer('RIFF' . "\0\0\0\0" . 'WEBPVP8 '));
    }

    /** @return iterable<string, array{string}> */
    public static function fichiersRefuses(): iterable
    {
        yield 'vide' => [''];
        yield 'script PHP déguisé' => ['<?php echo 1;'];
        yield 'SVG (peut contenir du script)' => ['<svg xmlns="http://www.w3.org/2000/svg"></svg>'];
    }

    #[DataProvider('fichiersRefuses')]
    public function testRefuseCeQuiNEstPasUnePhoto(string $contenu): void
    {
        $this->expectException(DomainError::class);
        $this->medias->envoyer($contenu);
    }

    public function testRefuseUneSuppressionHorsDuDossier(): void
    {
        $this->expectException(DomainError::class);
        $this->medias->supprimer('../../config/secrets.php');
    }
}
