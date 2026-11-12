import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Footer } from '../components/Footer/Footer';
import { Header } from '../components/Header/Header';
import { Accueil } from '../pages/Accueil/Accueil';
import { Confirmation } from '../pages/Confirmation/Confirmation';
import { EspaceClient } from '../pages/EspaceClient/EspaceClient';
import { EspacePro } from '../pages/EspacePro/EspacePro';
import { ActiverCompte, MotDePasse } from '../pages/Compte/MotDePasse';
import { RendezVous } from '../pages/RendezVous/RendezVous';
import { Cgv, Confidentialite, MentionsLegales, PageIntrouvable } from '../pages/Legal/Legal';
import { Reserver } from '../pages/Reserver/Reserver';

export function AppRoutes() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/reserver" element={<Reserver />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/mon-espace" element={<EspaceClient />} />
        <Route path="/compte/activer" element={<ActiverCompte />} />
        <Route path="/compte/mot-de-passe" element={<MotDePasse />} />
        <Route path="/rendez-vous" element={<RendezVous />} />
        <Route path="/pro" element={<EspacePro />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/cgv" element={<Cgv />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
        <Route path="*" element={<PageIntrouvable />} />
      </Routes>
      <Footer />
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
