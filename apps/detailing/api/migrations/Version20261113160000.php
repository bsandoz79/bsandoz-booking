<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Produits : catégorie libre (filtres de l'espace pro et du site), colonne catalog_product.category. */
final class Version20261113160000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Produits : colonne category';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE catalog_product ADD category VARCHAR(60) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE catalog_product DROP category');
    }
}
