<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Remise par unité supplémentaire d'une prestation (ex. 5 € de moins dès le 2e véhicule) : colonne prestation.remise_unite_cents. */
final class Version20261113120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Prestation : colonne remise_unite_cents';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE prestation ADD remise_unite_cents INT DEFAULT 0 NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE prestation DROP remise_unite_cents');
    }
}
