<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Paiements de l'acompte (Stripe Checkout) : aucune donnée de carte, seulement l'identifiant de session.
 * SQL généré par `doctrine:schema:create --dump-sql` sur la plateforme MySQL 8 (compatible MariaDB 10.6+).
 */
final class Version20261108030000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Paiement : table payment';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE payment (reservation_id VARCHAR(36) NOT NULL, provider_session_id VARCHAR(255) NOT NULL, amount_cents INT NOT NULL, refunded_cents INT NOT NULL, status VARCHAR(20) NOT NULL, paid_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, id VARCHAR(36) NOT NULL, INDEX idx_payment_reservation (reservation_id), UNIQUE INDEX uniq_payment_session (provider_session_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE payment');
    }
}
