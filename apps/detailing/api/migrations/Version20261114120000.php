<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Abonnements : offres du pro, souscriptions des clients (prélèvement automatique à chaque période), prélèvements
 * reçus (comptabilité), et réservations faites avec un abonnement (prestation comprise déduite).
 */
final class Version20261114120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Abonnements : offres, souscriptions, prélèvements ; abonnement utilisé par une réservation';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE subscription_plan (id VARCHAR(36) NOT NULL, name VARCHAR(120) NOT NULL, prestation_id VARCHAR(36) NOT NULL, frequency VARCHAR(20) NOT NULL, price_cents INT NOT NULL, description LONGTEXT NOT NULL, active TINYINT NOT NULL, position INT NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE subscription (id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, plan_id VARCHAR(36) NOT NULL, frequency VARCHAR(20) NOT NULL, created_at DATETIME NOT NULL, status VARCHAR(20) NOT NULL, started_at DATETIME DEFAULT NULL, period_end DATETIME DEFAULT NULL, provider_id VARCHAR(255) DEFAULT NULL, session_id VARCHAR(255) DEFAULT NULL, cancel_requested TINYINT NOT NULL, ended_at DATETIME DEFAULT NULL, INDEX idx_subscription_user (user_id), INDEX idx_subscription_session (session_id), INDEX idx_subscription_provider (provider_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE subscription_payment (id VARCHAR(36) NOT NULL, subscription_id VARCHAR(36) NOT NULL, provider_invoice_id VARCHAR(255) NOT NULL, amount_cents INT NOT NULL, paid_at DATETIME NOT NULL, UNIQUE INDEX uniq_subscription_payment_invoice (provider_invoice_id), INDEX idx_subscription_payment_paid (paid_at), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE reservation ADD subscription_id VARCHAR(36) DEFAULT NULL, ADD subscription_discount_cents INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation DROP subscription_id, DROP subscription_discount_cents');
        $this->addSql('DROP TABLE subscription_payment');
        $this->addSql('DROP TABLE subscription');
        $this->addSql('DROP TABLE subscription_plan');
    }
}
