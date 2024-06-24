#!/usr/bin/env node

import "zx/globals";

import * as os from "node:os";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import * as url from "node:url";

import isValidFilename from "valid-filename";
import validateNpmName from "validate-npm-package-name";
import { $, which, usePowerShell } from "zx";
import inquirer from "inquirer";
import nunjucks from "nunjucks";

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const args = yargs(hideBin(process.argv))
  .option("name", {
    type: "string",
    description: "Name of the package",
  })
  .option("email", {
    type: "string",
    description: "Admin email",
  })
  .option("password", {
    type: "string",
    description: "Admin password",
  })
  .option("pnpm", {
    type: "boolean",
    description: "Install pnpm if not found",
  })
  .option("bootstrap", {
    type: "boolean",
    description: "Run bootstrap after install",
    default: true,
  });
process.env.FORCE_COLOR = "1";

if (os.platform() === "win32") {
  usePowerShell();
}

$.verbose = true;

function getStubRoot() {
  const stubs = path.join(
    path.dirname(url.fileURLToPath(new URL(import.meta.url))),
    "../stubs"
  );
  return stubs;
}

async function getStubFiles() {
  const files = await fsp.readdir(getStubRoot(), {
    recursive: true,
  });

  return await Promise.all(
    files
      .filter((file) => {
        return fs.lstatSync(path.join(getStubRoot(), file)).isFile();
      })
      .map(async (file) => ({
        target: file.replace(/\.njk$/, ""),
        template: file.endsWith(".njk"),
        directory: path.dirname(file),
        contents: (
          await fsp.readFile(path.join(getStubRoot(), file))
        ).toString(),
      }))
  );
}

(async function () {
  const argv = await args.argv;

  try {
    await which("pnpm");
  } catch (err) {
    let { pnpm } = await inquirer.prompt([
      {
        when: !(argv.pnpm ?? false),
        name: "pnpm",
        message: "pnpm not found, would you like to install it with corepack?",
        type: "confirm",
        default: argv.pnpm,
      },
    ]);

    pnpm = pnpm ?? argv.pnpm;

    if (pnpm) {
      await $`corepack install --global pnpm`.stdio("inherit");
    } else {
      console.error("error: unable to proceed without pnpm.");
      process.exit(1);
    }
  }

  let { name, email, password } = await inquirer.prompt([
    {
      when: !argv.name,
      name: "name",
      message: "What is the name of the package?",
      type: "input",
      default: path.basename(process.cwd()),
      async validate(input, answers) {
        const { validForNewPackages, warnings, errors, ...others } =
          validateNpmName(input);

        let error =
          errors?.[0] ??
          warnings?.[0] ??
          (!validForNewPackages
            ? `${input} is not a valid package name`
            : false);
        if (error) {
          return error;
        }

        if (!isValidFilename(input)) {
          return `"${input}" is not a valid file name.`;
        }
        if (fs.existsSync(input)) {
          return `"${input}" already exists. Please choose a different name.`;
        }
        return true;
      },
    },
    {
      when: !argv.email,
      name: "email",
      message: "Admin email?",
      type: "input",
      default: "admin@example.com",
      validate(input) {
        if (!input || !input.includes("@")) {
          return "Email is required.";
        }
        return true;
      },
    },
    {
      when: !argv.password,
      name: "password",
      message: "Admin password? [default: password]",
      default: "password",
      type: "password",
      validate(input) {
        if (!input || !input.length) {
          return "Password is required.";
        }
        return true;
      },
    },
  ]);

  name = name ?? argv.name;
  email = email ?? argv.email;
  password = password ?? argv.password;

  console.log(`Creating package "${name}"`);

  await fsp.mkdir(`./${name}`, {
    recursive: true,
  });

  within(async () => {
    cd(`./${name}`);

    const files = await getStubFiles();

    const key = crypto.randomUUID();
    const secret = crypto.randomUUID();

    for (const file of files) {
      await fsp.mkdir(file.directory, {
        recursive: true,
      });

      const contents = nunjucks.renderString(file.contents, {
        key,
        secret,
        name,
        email,
        password,
      });

      console.log(`Writing ${file.target.replace(/\\/g, "/")}`);
      await fsp.writeFile(file.target, contents);
    }

    await $`pnpm install`.stdio("inherit");
    if (argv.bootstrap) {
      await $`pnpm bootstrap`.stdio("inherit");
    }
  });

  console.log("");
  console.log("Done!");
})();
