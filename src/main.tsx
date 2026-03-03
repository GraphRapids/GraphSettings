import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";
import { widgetFromLocationSearch } from "./widgets";

const widget = widgetFromLocationSearch(window.location.search);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App widget={widget} />
  </StrictMode>,
);
