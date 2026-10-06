import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  use: { baseURL: "http://127.0.0.1:4317", browserName: "chromium", screenshot: "only-on-failure" },
  webServer: { command: "python3 -m http.server 4317 --bind 127.0.0.1 --directory examples/site", url: "http://127.0.0.1:4317", reuseExistingServer: false },
});
