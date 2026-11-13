<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Avoirs des clients (annulation tardive : somme gardée pour le prochain rendez-vous) et avoir déduit d'une réservation. */
final class Version20261113123000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Avoirs : table customer_credit, colonne reservation.credit_used_cents';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE customer_credit (user_id VARCHAR(36) NOT NULL, balance_cents INT NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY(user_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE reservation ADD credit_used_cents INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE customer_credit');
        $this->addSql('ALTER TABLE reservation DROP credit_used_cents');
    }
}
