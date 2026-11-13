<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Réservations : date de prise du rendez-vous (historique de l'espace pro), colonne reservation.created_at. */
final class Version20261113170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Réservations : colonne created_at';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation ADD created_at DATETIME DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation DROP created_at');
    }
}
