<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Réglages du pro (règles de réservation, zone), prioritaires sur config/packages/bsandoz_core.yaml.
 * SQL généré par `doctrine:schema:create --dump-sql` sur la plateforme MySQL 8 (compatible MariaDB 10.6+).
 */
final class Version20261112010000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Espace pro : table setting';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE setting (value JSON NOT NULL, updated_at DATETIME NOT NULL, setting_key VARCHAR(60) NOT NULL, PRIMARY KEY (setting_key)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE setting');
    }
}
