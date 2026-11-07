<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Réservation : horaires d'ouverture, indisponibilités, réservations (dates en UTC).
 * SQL généré par `doctrine:schema:create --dump-sql` sur la plateforme MySQL 8 (compatible MariaDB 10.6+).
 */
final class Version20261107230000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Réservation : tables opening_hour, unavailability et reservation';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE opening_hour (weekday SMALLINT NOT NULL, starts_at VARCHAR(5) NOT NULL, ends_at VARCHAR(5) NOT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE unavailability (reason VARCHAR(255) NOT NULL, id VARCHAR(36) NOT NULL, period_start DATETIME NOT NULL, period_end DATETIME NOT NULL, INDEX idx_unavailability_period (period_start, period_end), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE reservation (user_id VARCHAR(36) NOT NULL, prestation_id VARCHAR(36) NOT NULL, variante VARCHAR(60) DEFAULT NULL, option_ids JSON NOT NULL, address LONGTEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, total_cents INT NOT NULL, deposit_cents INT NOT NULL, travel_fee_cents INT NOT NULL, metier_data JSON NOT NULL, notes LONGTEXT NOT NULL, status VARCHAR(20) NOT NULL, hold_expires_at DATETIME DEFAULT NULL, id VARCHAR(36) NOT NULL, period_start DATETIME NOT NULL, period_end DATETIME NOT NULL, INDEX idx_reservation_period (period_start, period_end), INDEX idx_reservation_user (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE reservation');
        $this->addSql('DROP TABLE unavailability');
        $this->addSql('DROP TABLE opening_hour');
    }
}
