<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Comptes clients (créés automatiquement à la réservation). Table « user_account » : « user » est réservé dans plusieurs bases.
 * SQL généré par `doctrine:schema:create --dump-sql` sur la plateforme MySQL 8 (compatible MariaDB 10.6+).
 */
final class Version20261108000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Comptes : table user_account';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE user_account (email VARCHAR(180) NOT NULL, firstname VARCHAR(100) NOT NULL, lastname VARCHAR(100) NOT NULL, phone VARCHAR(30) NOT NULL, roles JSON NOT NULL, password_hash VARCHAR(255) DEFAULT NULL, status VARCHAR(20) NOT NULL, created_at DATETIME DEFAULT NULL, id VARCHAR(36) NOT NULL, UNIQUE INDEX uniq_user_email (email), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE user_account');
    }
}
