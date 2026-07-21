import esbuild from "esbuild";
await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  format: "cjs",
  target: "es2022",
  logLevel: "info",
  sourcemap: "inline",
  minify: process.argv[2] === "production",
  outfile: "main.js",
});
