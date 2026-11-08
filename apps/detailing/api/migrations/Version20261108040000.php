<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Journal des notifications programmées déjà envoyées (rappels de la veille).
 * SQL généré par `doctrine:schema:create --dump-sql` sur la plateforme MySQL 8 (compatible MariaDB 10.6+).
 */
final class Version20261108040000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Notifications : table notification';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE notification (type VARCHAR(40) NOT NULL, reservation_id VARCHAR(36) NOT NULL, sent_at DATETIME NOT NULL, id VARCHAR(36) NOT NULL, UNIQUE INDEX uniq_notification_type_reservation (type, reservation_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE notification');
    }
}
