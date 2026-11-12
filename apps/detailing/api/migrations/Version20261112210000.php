<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Nombre d'unités réservées (ex. véhicules) : colonne reservation.quantity (null : 1 pour les réservations antérieures). */
final class Version20261112210000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Réservation : colonne quantity';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation ADD quantity INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation DROP quantity');
    }
}
