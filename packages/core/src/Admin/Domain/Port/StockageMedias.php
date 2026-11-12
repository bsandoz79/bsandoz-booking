<?php

declare(strict_types=1);

namespace Bsandoz\Core\Admin\Domain\Port;

/** Photos du site envoyées par le pro (réalisations avant / après, logo…). */
interface StockageMedias
{
    /** Enregistre le fichier sous un nom unique (ex. « 3f2a….jpg ») et renvoie ce nom. */
    public function enregistrer(string $contenu, string $extension): string;

    /** Sans effet si le fichier n'existe pas. */
    public function supprimer(string $nom): void;

    /** @return list<string> noms des fichiers, du plus récent au plus ancien */
    public function lister(): array;
}
