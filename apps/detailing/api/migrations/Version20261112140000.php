<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Carte de fidélité : table loyalty_card et remise de fidélité sur la réservation.
 * SQL de la plateforme MySQL 8 (compatible MariaDB 10.6+), comme `doctrine:schema:create --dump-sql`.
 */
final class Version20261112140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Fidélité : table loyalty_card, colonne reservation.loyalty_discount_cents';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE loyalty_card (user_id VARCHAR(36) NOT NULL, stamps INT NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY (user_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE reservation ADD loyalty_discount_cents INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation DROP loyalty_discount_cents');
        $this->addSql('DROP TABLE loyalty_card');
    }
}
