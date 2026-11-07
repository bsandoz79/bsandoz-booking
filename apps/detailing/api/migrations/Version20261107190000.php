<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Catalogue du kit : catégories, options, prestations (tarifs et options autorisées en JSON).
 * SQL généré par `doctrine:schema:create --dump-sql` sur la plateforme MySQL 8 (compatible MariaDB 10.6+).
 */
final class Version20261107190000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Catalogue : tables category, catalog_option et prestation';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE category (name VARCHAR(120) NOT NULL, position INT NOT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE catalog_option (name VARCHAR(120) NOT NULL, description LONGTEXT NOT NULL, price_cents INT NOT NULL, duration_min INT NOT NULL, active TINYINT NOT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE prestation (name VARCHAR(120) NOT NULL, description LONGTEXT NOT NULL, base_price_cents INT NOT NULL, base_duration_min INT NOT NULL, active TINYINT NOT NULL, category_id VARCHAR(36) DEFAULT NULL, position INT NOT NULL, tarifs JSON NOT NULL, option_ids JSON NOT NULL, id VARCHAR(36) NOT NULL, INDEX idx_prestation_active_position (active, position), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE prestation');
        $this->addSql('DROP TABLE catalog_option');
        $this->addSql('DROP TABLE category');
    }
}
