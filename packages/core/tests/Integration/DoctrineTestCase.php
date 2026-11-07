<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration;

use Bsandoz\Core\Shared\Infrastructure\Persistence\ChiffreType;
use Bsandoz\Core\Shared\Infrastructure\Persistence\DoctrineMappings;
use Bsandoz\Core\Shared\Infrastructure\Security\Chiffreur;
use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Types\Type;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Mapping\Driver\SimplifiedXmlDriver;
use Doctrine\ORM\ORMSetup;
use Doctrine\ORM\Tools\SchemaTool;
use PHPUnit\Framework\TestCase;

/** Base SQLite en mémoire, schéma recréé pour chaque test à partir des mappings du kit. */
abstract class DoctrineTestCase extends TestCase
{
    /** Clé factice réservée aux tests. */
    protected const CLE_DE_TEST = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

    protected EntityManagerInterface $em;

    protected function setUp(): void
    {
        foreach (DoctrineMappings::types() as $name => $class) {
            if (!Type::hasType($name)) {
                Type::addType($name, $class);
            }
        }
        ChiffreType::utiliser(new Chiffreur(self::CLE_DE_TEST));

        $prefixes = [];
        foreach (DoctrineMappings::mappings() as $mapping) {
            $prefixes[$mapping['dir']] = $mapping['prefix'];
        }

        $config = ORMSetup::createConfiguration(isDevMode: true);
        $config->setMetadataDriverImpl(new SimplifiedXmlDriver($prefixes));

        $connection = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true], $config);
        $this->em = new EntityManager($connection, $config);

        (new SchemaTool($this->em))->createSchema($this->em->getMetadataFactory()->getAllMetadata());
    }

    /** Vide l'unité de travail pour relire depuis la base. */
    protected function reload(): void
    {
        $this->em->clear();
    }
}
