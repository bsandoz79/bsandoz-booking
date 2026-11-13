<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/** Comptabilité simple : dépenses du pro (ponctuelles ou mensuelles). */
final class Version20261113140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Comptabilité : table expense';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE expense (id VARCHAR(36) NOT NULL, spent_on DATE NOT NULL, label VARCHAR(120) NOT NULL, amount_cents INT NOT NULL, monthly TINYINT NOT NULL, ends_on DATE DEFAULT NULL, INDEX idx_expense_date (spent_on), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE expense');
    }
}
