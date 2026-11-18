<?php

declare(strict_types=1);

namespace Bsandoz\Core\Carte\Infrastructure\Persistence;

use Bsandoz\Core\Carte\Domain\Model\Article;
use Bsandoz\Core\Carte\Domain\Port\Articles;
use Bsandoz\Core\Shared\Domain\NotFound;
use Doctrine\ORM\EntityManagerInterface;

final class DoctrineArticles implements Articles
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $id): Article
    {
        return $this->em->find(Article::class, $id) ?? throw new NotFound('Article introuvable.');
    }

    public function all(): array
    {
        /** @var list<Article> */
        return $this->em->getRepository(Article::class)->findBy([], ['position' => 'ASC', 'nom' => 'ASC']);
    }

    public function save(Article $article): void
    {
        $this->em->persist($article);
        $this->em->flush();
    }

    public function remove(Article $article): void
    {
        $this->em->remove($article);
        $this->em->flush();
    }
}
