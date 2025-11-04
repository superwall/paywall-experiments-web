
/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { PostHogProvider } from "posthog-js/react";

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <PostHogProvider
      apiKey={'phc_SD2craDx6Gv9ahU9ThhWaFxBo8v7KpoVWWDgXwtGlkM'}
      options={{
        api_host: 'https://pickle.superwall.com',
        defaults: '2025-05-24',
        capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
        debug: true,
      }}
    >
      <App />
    </PostHogProvider>
  </StrictMode>
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}
