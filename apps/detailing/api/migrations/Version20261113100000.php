<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Facturation : table invoice (numéro unique, une facture par réservation, vendeur / client / lignes figés). */
final class Version20261113100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Facturation : table invoice';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE invoice (number VARCHAR(20) NOT NULL, reservation_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, issued_at DATETIME NOT NULL, service_at DATETIME NOT NULL, seller JSON NOT NULL, customer JSON NOT NULL, `lines` JSON NOT NULL, total_cents INT NOT NULL, paid_online_cents INT NOT NULL, id VARCHAR(36) NOT NULL, INDEX idx_invoice_user (user_id), UNIQUE INDEX uniq_invoice_number (number), UNIQUE INDEX uniq_invoice_reservation (reservation_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE invoice');
    }
}
