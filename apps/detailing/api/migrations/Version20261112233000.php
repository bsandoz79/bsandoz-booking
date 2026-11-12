<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Mode de paiement choisi par le client (en ligne ou sur place) : colonne reservation.online_payment. */
final class Version20261112233000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Réservation : colonne online_payment';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation ADD online_payment TINYINT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation DROP online_payment');
    }
}
