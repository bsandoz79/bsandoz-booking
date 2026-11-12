<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Appareils du pro abonnés aux notifications push (Web Push).
 * SQL de la plateforme MySQL 8 (compatible MariaDB 10.6+), comme `doctrine:schema:create --dump-sql`.
 */
final class Version20261112100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Notifications push : table push_subscription';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE push_subscription (id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, endpoint LONGTEXT NOT NULL, public_key VARCHAR(255) NOT NULL, auth_token VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE push_subscription');
    }
}
