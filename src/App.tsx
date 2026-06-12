import { Routes, Route } from "react-router-dom";
import { LocaleProvider } from "./lib/locale.js";
import HomePage from "./pages/HomePage.js";

export default function App() {
  return (
    <LocaleProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </LocaleProvider>
  );
}
