<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Produits vendus avec une réservation : table catalog_product (stock tenu par le pro) et produits de la réservation.
 * SQL de la plateforme MySQL 8 (compatible MariaDB 10.6+), comme `doctrine:schema:create --dump-sql`.
 */
final class Version20261112200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Produits : table catalog_product, colonne reservation.products';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE catalog_product (name VARCHAR(120) NOT NULL, description LONGTEXT NOT NULL, price_cents INT NOT NULL, stock INT NOT NULL, active TINYINT NOT NULL, position INT NOT NULL, photo VARCHAR(255) DEFAULT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE reservation ADD products JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation DROP products');
        $this->addSql('DROP TABLE catalog_product');
    }
}
