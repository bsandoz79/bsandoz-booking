import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Footer } from '../components/Footer/Footer';
import { Header } from '../components/Header/Header';
import { Accueil } from '../pages/Accueil/Accueil';
import { Confirmation } from '../pages/Confirmation/Confirmation';
import { EspaceClient } from '../pages/EspaceClient/EspaceClient';
import { EspacePro } from '../pages/EspacePro/EspacePro';
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
        <Route path="/pro" element={<EspacePro />} />
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
