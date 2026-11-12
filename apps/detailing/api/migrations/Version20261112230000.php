<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Mise en avant d'une prestation (ex. « Le plus choisi ») : colonne prestation.badge. */
final class Version20261112230000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Prestation : colonne badge';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE prestation ADD badge VARCHAR(40) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE prestation DROP badge');
    }
}
