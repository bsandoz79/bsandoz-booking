<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration;

/**
 * Doctrine crée des objets chargés à la demande (« lazy ghosts ») à partir des entités : une entité « final » fait
 * échouer le cache de production au déploiement (`cache:warmup --env=prod`), sans qu'aucun autre test ne le voie.
 */
final class EntitesNonFinalesTest extends DoctrineTestCase
{
    public function testAucuneEntiteDuKitNEstFinal(): void
    {
        $finales = [];
        foreach ($this->em->getMetadataFactory()->getAllMetadata() as $metadata) {
            // Les objets intégrés (embeddables, ex. TimeRange) ne sont jamais chargés à la demande : ils peuvent rester « final ».
            if (!$metadata->isEmbeddedClass && $metadata->getReflectionClass()->isFinal()) {
                $finales[] = $metadata->getName();
            }
        }

        self::assertSame([], $finales, 'Entités à ne pas déclarer « final »');
    }
}
