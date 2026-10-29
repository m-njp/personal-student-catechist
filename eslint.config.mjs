import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // MediaPipe's wasm loader is copied into public/ as built, so it is not our code to lint.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tools/**",
    "public/lessons/lesson-04/greet-the-world/mediapipe/**",
  ]),
]);

export default eslintConfig;
