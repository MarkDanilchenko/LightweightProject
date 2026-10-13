import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";
import path from "path";

const __dirname: string = import.meta.dirname;

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: path.resolve(__dirname, "../../server"),
    include: ["**/*.e2e-spec.ts"],
    testTimeout: 30_000,
    alias: [
      { find: /^#server\/(.*)/, replacement: path.resolve(__dirname, "../../server/src/$1") },
      { find: /^#shared\/(.*)/, replacement: path.resolve(__dirname, "../../shared/$1") },
    ],
    coverage: {
      provider: "v8",
      reporter: ["html"],
      reportsDirectory: path.resolve(__dirname, "coverage/e2e"),
      include: ["**/*.(t|j)s"],
      exclude: [
        "**/*.(module|types|interfaces|dto|schema|guard).(t|j)s",
        "**/src/configs/**",
        "**/coverage/**",
        "**/dist/**",
        "**/insomnia/**",
        "**/migrations/**",
        "**/templates/**",
        "**/tests/**",
        "**/.adminjs/**",
        "**/*.(json|yaml|yml)",
      ],
      thresholds: {
        branches: 40,
        functions: 50,
        "**/src/**/*.controller.ts": {
          lines: 80,
          statements: 80,
          functions: 80,
        },
      },
    },
    bail: 1,
    fileParallelism: false,
    teardownTimeout: 5_000,
    globalSetup: path.resolve(__dirname, "./global-settings.ts"),
  },
  cacheDir: path.resolve(__dirname, "../../node_modules/.vite"),
  plugins: [swc.vite()],
});
