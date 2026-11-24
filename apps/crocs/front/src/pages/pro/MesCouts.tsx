import { couts } from '../../data/couts';
import { createur } from '../../data/createur';
import styles from '../EspacePro.module.css';

/** Onglet « Coûts » : ce que coûte le site, les options et ce que ça donne dans le temps, en tableaux. */
export function MesCouts() {
  return (
    <div className={styles.pile}>
      <p className={styles.aide}>{couts.intro}</p>

      <section className={styles.carteBlanche} aria-labelledby="couts-aujourdhui">
        <h2 id="couts-aujourdhui">{couts.aujourdhui.titre}</h2>
        <table className={styles.tableau}>
          <thead>
            <tr><th scope="col">Quoi</th><th scope="col">Coût</th></tr>
          </thead>
          <tbody>
            {couts.aujourdhui.lignes.map((l) => (
              <tr key={l.poste}>
                <th scope="row">{l.poste}<span className={styles.detail}>{l.detail}</span></th>
                <td>{l.cout}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th scope="row">{couts.aujourdhui.total.poste}</th><td>{couts.aujourdhui.total.cout}</td></tr>
          </tfoot>
        </table>
      </section>

      <section className={styles.carteBlanche} aria-labelledby="couts-options">
        <h2 id="couts-options">{couts.options.titre}</h2>
        <table className={styles.tableau}>
          <thead>
            <tr><th scope="col">Quoi</th><th scope="col">Coût</th></tr>
          </thead>
          <tbody>
            {couts.options.lignes.map((l) => (
              <tr key={l.poste}>
                <th scope="row">{l.poste}</th>
                <td>{l.cout}<span className={styles.detail}>{l.duree}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.carteBlanche} aria-labelledby="couts-temps">
        <h2 id="couts-temps">{couts.dansLeTemps.titre}</h2>
        <table className={`${styles.tableau} ${styles.tableauPhrases}`}>
          <thead>
            <tr><th scope="col">Quand</th><th scope="col">Ce que vous payez</th></tr>
          </thead>
          <tbody>
            {couts.dansLeTemps.lignes.map((l) => (
              <tr key={l.periode}>
                <th scope="row">{l.periode}</th>
                <td>{l.paye}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.carteBlanche} aria-labelledby="couts-prix">
        <h2 id="couts-prix">{couts.participatif.titre}</h2>
        <div className={styles.texte}>
          {couts.participatif.paragraphes.map((p) => <p key={p}>{p}</p>)}
        </div>
        <p className={styles.aide}>{couts.bonASavoir}</p>
        <p className={styles.aide}>Prix relevés en {couts.releve}, donnés à titre indicatif.</p>
      </section>

      <nav className={styles.carteBlanche} aria-label={`Pour en savoir plus sur ${createur.nom}`}>
        <ul className={styles.liensCreateur}>
          {createur.liens.map((l) => (
            <li key={l.url}>
              {l.nom} : <a href={l.url} target="_blank" rel="noopener noreferrer">{l.adresse}</a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
