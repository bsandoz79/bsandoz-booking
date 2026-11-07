<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Prestations à durée incertaine : elles occupent toute la demi-journée (colonne occupe_plage, faux par défaut). */
final class Version20261107210000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Catalogue : colonne prestation.occupe_plage';
    }

    public function up(Schema $schema): void
    {
        // Les prestations existantes prennent la valeur implicite 0 (durée fiable).
        $this->addSql('ALTER TABLE prestation ADD occupe_plage TINYINT NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE prestation DROP occupe_plage');
    }
}
