<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Jetons envoyés par mail (activation, mot de passe oublié, gestion d'une réservation) : seul le hachage est stocké.
 * SQL généré par `doctrine:schema:create --dump-sql` sur la plateforme MySQL 8 (compatible MariaDB 10.6+).
 */
final class Version20261108010000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Comptes : table auth_token';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE auth_token (subject_id VARCHAR(36) NOT NULL, type VARCHAR(20) NOT NULL, token_hash VARCHAR(64) NOT NULL, expires_at DATETIME NOT NULL, used_at DATETIME DEFAULT NULL, id VARCHAR(36) NOT NULL, INDEX idx_auth_token_subject (subject_id, type), UNIQUE INDEX uniq_auth_token_hash (token_hash), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE auth_token');
    }
}
