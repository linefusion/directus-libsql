#!/usr/bin/env tsx

import { $, cd, usePowerShell, within } from "zx";
import fsp from "node:fs/promises";

import * as os from "node:os";
import * as path from "node:path";

if (os.platform() == "win32") {
  usePowerShell();
}

(async () => {
  try {
    const { version } = JSON.parse(
      (await fsp.readFile("package.json", "utf-8")).toString()
    );

    console.clear();
    console.log("Installing...");
    await $`pnpm install`;

    console.log("Syncing versions...");
    const packages =
      await $`pnpm list --filter ./packages/* --json --depth 0`.json();

    const packageFiles = await Promise.all(
      packages
        .map((pkg: { path: string }) => path.join(pkg.path, "package.json"))
        .map(async (packageFile: string) => ({
          path: packageFile,
          contents: JSON.parse(await fsp.readFile(packageFile, "utf-8")),
        }))
    );

    for (const pkg of packageFiles) {
      pkg.contents.version = version;
      await fsp.writeFile(
        pkg.path,
        JSON.stringify(pkg.contents, null, 2) + `\n`
      );
    }

    console.log("Building code...");
    await $`pnpm -r build`;

    console.log("Building and pushing images...");
    await within(async () => {
      cd("docker");
      await $`docker build --push --tag linefusion/directus-libsql:latest --tag linefusion/directus-libsql:${version} .`;
    });

    console.log("Publishing packages...");
    await $`pnpm -r publish --no-git-checks`;

  } catch (err) {
    console.error("Error detected. Abording operation:\n\n", err.toString());
  }
})();
