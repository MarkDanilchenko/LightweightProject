import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";
import path from "path";

const __dirname: string = import.meta.dirname;

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: ".",
    include: ["**/*.spec.ts"],
    testTimeout: 5000,
    alias: [
      { find: /^#server\/(.*)/, replacement: path.resolve(__dirname, "server/src/$1") },
      { find: /^#shared\/(.*)/, replacement: path.resolve(__dirname, "shared/$1") },
    ],
    coverage: {
      provider: "v8",
      reporter: ["html"],
      reportsDirectory: "./coverage",
      include: ["**/*.(t|j)s"],
      exclude: [
        "**/*.(module|types|interfaces|dto|schema).(t|j)s",
        "**/src/configs/**",
        "**/coverage/**",
        "**/dist/**",
        "**/insomnia/**",
        "**/migrations/**",
        "**/templates/**",
        "**/tests/**",
        "**/.adminjs/**",
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    bail: 1,
    fileParallelism: false,
    teardownTimeout: 5000,
  },
  plugins: [swc.vite()],
});
