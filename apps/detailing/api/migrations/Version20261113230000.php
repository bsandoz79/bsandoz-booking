<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Encaissement sur place : moyen de paiement et date sur le rendez-vous, moyen recopié sur la facture, et paiements en
 * ligne marqués « sur place » quand le client paie le reste en scannant le QR code du pro.
 */
final class Version20261113230000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Encaissement sur place : moyen de paiement (réservation, facture), paiement par QR code';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation ADD on_site_payment_method VARCHAR(20) DEFAULT NULL, ADD on_site_paid_at DATETIME DEFAULT NULL');
        $this->addSql('ALTER TABLE invoice ADD on_site_payment_method VARCHAR(40) DEFAULT NULL');
        $this->addSql('ALTER TABLE payment ADD on_site TINYINT DEFAULT 0 NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation DROP on_site_payment_method, DROP on_site_paid_at');
        $this->addSql('ALTER TABLE invoice DROP on_site_payment_method');
        $this->addSql('ALTER TABLE payment DROP on_site');
    }
}
