<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Base de Croc's : toutes les tables du kit (comptes, carte, contenu du site, photos…), créées d'un coup.
 * Seules la carte, le contenu du site et l'espace pro servent ; les autres tables restent vides.
 */
final class Version20261119180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Base de Croc’s : tables du kit bsandoz/core (carte avec notes et pictogrammes de rubrique).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE category (name VARCHAR(120) NOT NULL, position INT NOT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE catalog_option (name VARCHAR(120) NOT NULL, description LONGTEXT NOT NULL, price_cents INT NOT NULL, duration_min INT NOT NULL, active TINYINT NOT NULL, position INT NOT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE prestation (name VARCHAR(120) NOT NULL, description LONGTEXT NOT NULL, base_price_cents INT NOT NULL, base_duration_min INT NOT NULL, active TINYINT NOT NULL, category_id VARCHAR(36) DEFAULT NULL, position INT NOT NULL, occupe_plage TINYINT NOT NULL, badge VARCHAR(40) DEFAULT NULL, remise_unite_cents INT NOT NULL, tarifs JSON NOT NULL, option_ids JSON NOT NULL, composition JSON DEFAULT NULL, composition_discount_cents INT DEFAULT 0 NOT NULL, id VARCHAR(36) NOT NULL, INDEX idx_prestation_active_position (active, position), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE catalog_product (name VARCHAR(120) NOT NULL, description LONGTEXT NOT NULL, price_cents INT NOT NULL, stock INT NOT NULL, active TINYINT NOT NULL, position INT NOT NULL, photo VARCHAR(255) DEFAULT NULL, category VARCHAR(60) DEFAULT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE auth_token (subject_id VARCHAR(36) NOT NULL, type VARCHAR(20) NOT NULL, token_hash VARCHAR(64) NOT NULL, expires_at DATETIME NOT NULL, used_at DATETIME DEFAULT NULL, id VARCHAR(36) NOT NULL, INDEX idx_auth_token_subject (subject_id, type), UNIQUE INDEX uniq_auth_token_hash (token_hash), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE user_account (email VARCHAR(180) NOT NULL, firstname VARCHAR(100) NOT NULL, lastname VARCHAR(100) NOT NULL, phone LONGTEXT NOT NULL, roles JSON NOT NULL, password_hash VARCHAR(255) DEFAULT NULL, status VARCHAR(20) NOT NULL, created_at DATETIME DEFAULT NULL, id VARCHAR(36) NOT NULL, UNIQUE INDEX uniq_user_email (email), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE customer_credit (balance_cents INT NOT NULL, updated_at DATETIME NOT NULL, user_id VARCHAR(36) NOT NULL, PRIMARY KEY (user_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE payment (reservation_id VARCHAR(36) NOT NULL, provider_session_id VARCHAR(255) NOT NULL, amount_cents INT NOT NULL, refunded_cents INT NOT NULL, status VARCHAR(20) NOT NULL, paid_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, on_site TINYINT DEFAULT 0 NOT NULL, id VARCHAR(36) NOT NULL, INDEX idx_payment_reservation (reservation_id), UNIQUE INDEX uniq_payment_session (provider_session_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE push_subscription (user_id VARCHAR(36) NOT NULL, endpoint LONGTEXT NOT NULL, public_key VARCHAR(255) NOT NULL, auth_token VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE notification (type VARCHAR(40) NOT NULL, reservation_id VARCHAR(36) NOT NULL, sent_at DATETIME NOT NULL, id VARCHAR(36) NOT NULL, UNIQUE INDEX uniq_notification_type_reservation (type, reservation_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE setting (value JSON NOT NULL, updated_at DATETIME NOT NULL, setting_key VARCHAR(60) NOT NULL, PRIMARY KEY (setting_key)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE opening_hour (weekday SMALLINT NOT NULL, starts_at VARCHAR(5) NOT NULL, ends_at VARCHAR(5) NOT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE reservation (user_id VARCHAR(36) NOT NULL, prestation_id VARCHAR(36) NOT NULL, variante VARCHAR(60) DEFAULT NULL, option_ids JSON NOT NULL, address LONGTEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, total_cents INT NOT NULL, deposit_cents INT NOT NULL, travel_fee_cents INT NOT NULL, metier_data JSON NOT NULL, notes LONGTEXT NOT NULL, loyalty_discount_cents INT DEFAULT NULL, products JSON DEFAULT NULL, quantity INT DEFAULT NULL, online_payment TINYINT DEFAULT NULL, credit_used_cents INT DEFAULT NULL, components JSON DEFAULT NULL, subscription_id VARCHAR(36) DEFAULT NULL, subscription_discount_cents INT DEFAULT NULL, created_at DATETIME DEFAULT NULL, on_site_payment_method VARCHAR(20) DEFAULT NULL, on_site_paid_at DATETIME DEFAULT NULL, status VARCHAR(20) NOT NULL, hold_expires_at DATETIME DEFAULT NULL, id VARCHAR(36) NOT NULL, period_start DATETIME NOT NULL, period_end DATETIME NOT NULL, INDEX idx_reservation_period (period_start, period_end), INDEX idx_reservation_user (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE unavailability (reason VARCHAR(255) NOT NULL, id VARCHAR(36) NOT NULL, period_start DATETIME NOT NULL, period_end DATETIME NOT NULL, INDEX idx_unavailability_period (period_start, period_end), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE loyalty_card (stamps INT NOT NULL, updated_at DATETIME NOT NULL, user_id VARCHAR(36) NOT NULL, PRIMARY KEY (user_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE expense (spent_on DATE NOT NULL, label VARCHAR(120) NOT NULL, amount_cents INT NOT NULL, monthly TINYINT NOT NULL, ends_on DATE DEFAULT NULL, id VARCHAR(36) NOT NULL, INDEX idx_expense_date (spent_on), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE subscription (user_id VARCHAR(36) NOT NULL, plan_id VARCHAR(36) NOT NULL, frequency VARCHAR(20) NOT NULL, created_at DATETIME NOT NULL, status VARCHAR(20) NOT NULL, started_at DATETIME DEFAULT NULL, period_end DATETIME DEFAULT NULL, provider_id VARCHAR(255) DEFAULT NULL, session_id VARCHAR(255) DEFAULT NULL, cancel_requested TINYINT NOT NULL, ended_at DATETIME DEFAULT NULL, id VARCHAR(36) NOT NULL, INDEX idx_subscription_user (user_id), INDEX idx_subscription_session (session_id), INDEX idx_subscription_provider (provider_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE subscription_plan (name VARCHAR(120) NOT NULL, prestation_id VARCHAR(36) NOT NULL, frequency VARCHAR(20) NOT NULL, price_cents INT NOT NULL, description LONGTEXT NOT NULL, active TINYINT NOT NULL, position INT NOT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE subscription_payment (subscription_id VARCHAR(36) NOT NULL, provider_invoice_id VARCHAR(255) NOT NULL, amount_cents INT NOT NULL, paid_at DATETIME NOT NULL, id VARCHAR(36) NOT NULL, INDEX idx_subscription_payment_paid (paid_at), UNIQUE INDEX uniq_subscription_payment_invoice (provider_invoice_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE carte_article (category_id VARCHAR(36) NOT NULL, name VARCHAR(120) NOT NULL, description LONGTEXT NOT NULL, price_cents INT NOT NULL, old_price_cents INT DEFAULT NULL, price_changed_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, sold_out_until DATETIME DEFAULT NULL, position INT NOT NULL, visible TINYINT NOT NULL, photo VARCHAR(255) DEFAULT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE carte_category (name VARCHAR(60) NOT NULL, position INT NOT NULL, note VARCHAR(200) DEFAULT \'\' NOT NULL, icon VARCHAR(40) DEFAULT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE invoice (number VARCHAR(20) NOT NULL, reservation_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, issued_at DATETIME NOT NULL, service_at DATETIME NOT NULL, seller JSON NOT NULL, customer JSON NOT NULL, `lines` JSON NOT NULL, total_cents INT NOT NULL, paid_online_cents INT NOT NULL, on_site_payment_method VARCHAR(40) DEFAULT NULL, id VARCHAR(36) NOT NULL, INDEX idx_invoice_user (user_id), UNIQUE INDEX uniq_invoice_number (number), UNIQUE INDEX uniq_invoice_reservation (reservation_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE invoice');
        $this->addSql('DROP TABLE carte_category');
        $this->addSql('DROP TABLE carte_article');
        $this->addSql('DROP TABLE subscription_payment');
        $this->addSql('DROP TABLE subscription_plan');
        $this->addSql('DROP TABLE subscription');
        $this->addSql('DROP TABLE expense');
        $this->addSql('DROP TABLE loyalty_card');
        $this->addSql('DROP TABLE unavailability');
        $this->addSql('DROP TABLE reservation');
        $this->addSql('DROP TABLE opening_hour');
        $this->addSql('DROP TABLE setting');
        $this->addSql('DROP TABLE notification');
        $this->addSql('DROP TABLE push_subscription');
        $this->addSql('DROP TABLE payment');
        $this->addSql('DROP TABLE customer_credit');
        $this->addSql('DROP TABLE user_account');
        $this->addSql('DROP TABLE auth_token');
        $this->addSql('DROP TABLE catalog_product');
        $this->addSql('DROP TABLE prestation');
        $this->addSql('DROP TABLE catalog_option');
        $this->addSql('DROP TABLE category');
    }
}
