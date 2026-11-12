# DataTable

Tableau de données générique : légende accessible, tri par colonne (`aria-sort`), message vide, ouverture d'une ligne, affichage en cartes sous 640 px.

```tsx
<DataTable
  caption="Réservations"
  rows={reservations}
  rowKey={(r) => r.id}
  emptyLabel="Aucune réservation"
  columns={[
    { key: 'client', header: 'Client', sortValue: (r) => r.client },
    { key: 'total', header: 'Total', align: 'end', render: (r) => formatPrix(r.total), sortValue: (r) => r.total },
  ]}
  onRowClick={ouvrir}
  rowActionLabel={(r) => `Ouvrir la réservation de ${r.client}`}
/>
```

Une colonne n'est triable que si `sortValue` est fourni. Le premier clic trie par ordre croissant, le second par ordre décroissant.
