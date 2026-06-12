import { Routes, Route } from "react-router-dom";
import { LocaleProvider } from "./lib/locale.js";
import HomePage from "./pages/HomePage.js";
import LobbyPage from "./pages/LobbyPage.js";

export default function App() {
  return (
    <LocaleProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:code" element={<LobbyPage />} />
      </Routes>
    </LocaleProvider>
  );
}
