<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Nouveaux textes du haut de l'accueil (slogan « L'éclat du neuf, livré chez vous. ») dans le contenu enregistré du site :
 * ceux de l'ancienne version restaient affichés, car le contenu enregistré passe avant les textes par défaut du site.
 * Seuls le surtitre, le grand titre et l'introduction changent ; points forts, photo et autres rubriques sont gardés.
 */
final class Version20261116220000 extends AbstractMigration
{
    private const TEXTES = [
        'surtitre' => 'Perfect Clean · lavage et detailing à domicile',
        'titre' => 'L’éclat du neuf, livré chez vous.',
        'introduction' => 'Mousse active, rinçage, finitions à la main : Perfect Clean vient à vous, à Abbeville et alentours.',
    ];

    public function getDescription(): string
    {
        return 'Accueil : nouveaux surtitre, titre et introduction dans le contenu enregistré';
    }

    public function up(Schema $schema): void
    {
        $valeur = $this->connection->fetchOne("SELECT value FROM setting WHERE setting_key = 'site'");
        if (!is_string($valeur)) {
            return; // rien d'enregistré : le site affiche déjà les nouveaux textes par défaut
        }
        $contenu = json_decode($valeur, true);
        if (!is_array($contenu) || !is_array($contenu['accueil'] ?? null)) {
            return;
        }
        $contenu['accueil'] = array_merge($contenu['accueil'], self::TEXTES);
        $this->addSql(
            "UPDATE setting SET value = :valeur WHERE setting_key = 'site'",
            ['valeur' => json_encode($contenu, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)],
        );
    }

    public function down(Schema $schema): void
    {
        // Les anciens textes ne sont pas restaurés : le pro peut les remettre depuis le site (crayon).
    }
}
