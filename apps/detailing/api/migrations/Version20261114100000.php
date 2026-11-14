<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Formules combinées (ex. formule complète : une formule intérieur et une formule extérieur au choix, avec remise) :
 * catégories combinées et remise sur la prestation, prestations choisies sur la réservation.
 */
final class Version20261114100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Formules combinées : composition et remise (prestation), prestations choisies (réservation)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE prestation ADD composition JSON DEFAULT NULL, ADD composition_discount_cents INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE reservation ADD components JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE prestation DROP composition, DROP composition_discount_cents');
        $this->addSql('ALTER TABLE reservation DROP components');
    }
}
