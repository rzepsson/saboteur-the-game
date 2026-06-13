import { Routes, Route } from "react-router-dom";
import { LocaleProvider } from "./lib/locale.js";
import AnimatedBackground from "./components/AnimatedBackground.js";
import { LanguageSwitcher } from "./components/LanguageSwitcher.js";
import HomePage from "./pages/HomePage.js";
import LobbyPage from "./pages/LobbyPage.js";

export default function App() {
  return (
    <LocaleProvider>
      <AnimatedBackground variant="cave" />
      <LanguageSwitcher />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:code" element={<LobbyPage />} />
      </Routes>
    </LocaleProvider>
  );
}
