import "./index.css";
import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { PaywallBuilder } from "./PaywallBuilder";
import { ResultPage } from "./ResultPage";

function ResultRoute() {
  const { slug } = useParams<{ slug: string }>();
  console.log("[App] ResultRoute - slug from params:", slug);
  console.log("[App] ResultRoute - window.location.pathname:", window.location.pathname);
  
  if (!slug) {
    console.error("[App] ResultRoute - slug is undefined!");
  }
  
  return <ResultPage slug={slug!} />;
}

export function App() {
  return (
    <HelmetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<PaywallBuilder />} />
          <Route path="/r/:slug" element={<ResultRoute />} />
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;
