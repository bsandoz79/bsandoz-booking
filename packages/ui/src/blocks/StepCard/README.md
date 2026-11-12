# StepCard

Étape d'un parcours en accordéon (réservation, devis) : une seule étape ouverte à la fois.

- `status="active"` : titre et contenu (`children`) ; le focus passe sur le titre quand l'étape s'ouvre.
- `status="done"` : repliée, pastille ✓, résumé du choix (`summary`, tronqué sur une ligne) et bouton `editLabel` (« Modifier » par défaut) qui appelle `onEdit`.
- `status="upcoming"` : numéro et titre grisés, bordure en pointillés.

```tsx
<StepCard number={1} title="Votre choix" status="done" summary="Formule B" onEdit={() => setEtape(0)} />
<StepCard number={2} title="Où et quand ?" status="active">…</StepCard>
<StepCard number={3} title="Vos coordonnées" status="upcoming" />
```
