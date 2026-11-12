# @bsandoz/ui

Blocs React réutilisables du kit de réservation. Aucun texte métier en dur : tout passe par les props. Thème via les variables `--bs-*` de `src/styles/tokens.css`, à surcharger par client (y compris un thème sombre : surcharger les mêmes variables sous un sélecteur, ex. `[data-theme="nuit"]`).

| Bloc | Rôle |
| --- | --- |
| Calendar | calendrier mensuel, jours disponibles |
| SlotPicker | créneaux d'un jour |
| OptionCard | carte sélectionnable (formule, option) |
| ChoiceChips | choix unique en pastilles |
| PriceSummary | récapitulatif de prix et acompte |
| Stepper | barre de progression |
| StepCard | étape repliable d'un parcours en accordéon (active, terminée avec résumé et « Modifier », à venir) |
| Dialog | fenêtre modale accessible (focus gardé, Échap, monte du bas sur téléphone) |

`npm run test` · `npm run lint` · `npm run build` (vérification TypeScript).
