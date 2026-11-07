<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Téléphone chiffré : la valeur chiffrée dépasse 30 caractères. L'adresse (reservation.address) est déjà en LONGTEXT.
 * Les valeurs déjà enregistrées en clair restent lisibles ; elles sont chiffrées au prochain enregistrement.
 */
final class Version20261108020000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Comptes : user_account.phone en LONGTEXT (chiffré)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user_account CHANGE phone phone LONGTEXT NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user_account CHANGE phone phone VARCHAR(30) NOT NULL');
    }
}
