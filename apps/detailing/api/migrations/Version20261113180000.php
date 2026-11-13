<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Options : ordre d'affichage réglable (glisser-déposer), colonne catalog_option.position. */
final class Version20261113180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Options : colonne position';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE catalog_option ADD position INT DEFAULT 0 NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE catalog_option DROP position');
    }
}
