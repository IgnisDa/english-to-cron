import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

export default [
  {
    input: "src/index.ts",
    output: { dir: "dist/esm", format: "esm", sourcemap: true },
    plugins: [typescript({ tsconfig: "./tsconfig.json" })],
  },
  {
    input: "src/index.ts",
    output: { dir: "dist/cjs", format: "cjs", sourcemap: true },
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        declarationDir: undefined,
        outDir: "dist/cjs",
      }),
    ],
  },
  {
    input: "dist/esm/index.d.ts",
    output: { file: "dist/types/index.d.ts", format: "esm" },
    plugins: [dts()],
  },
];