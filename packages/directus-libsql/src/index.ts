import "dotenv/config";

import type { Database } from "libsql";

import Client_BetterSQLite3 from "knex/lib/dialects/better-sqlite3";
import libsql from "libsql";

import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

function validateEnv(requiredKeys: string[]) {
  for (const requiredKey of requiredKeys) {
    if (requiredKey in process.env === false) {
      console.error(`ERROR: "${requiredKey}" Environment Variable is missing.`);
      process.exit(1);
    }
  }
}

class Client_Libsql extends Client_BetterSQLite3 {
  constructor(config: any) {
    super({
      ...(config ?? {}),
      useNullAsDefault: true,
    });

    const dirname = path.dirname(this.connectionSettings.filename);
    if (dirname.length > 0) {
      fs.mkdirSync(dirname, {
        recursive: true,
      });
    }
  }

  async acquireRawConnection() {


    const connection = new this.driver(
      this.connectionSettings.filename,
      this.connectionSettings
    );

    if (this.connectionSettings.sync) {
      connection.sync();
    }

    // connection.pragma("journal_mode = WAL");
    connection.pragma("foreign_keys = ON");

    return connection;
  }

  query(conn: Database, obj: string | { sql: string }) {
    // Workaround for
    // https://github.com/directus/directus/blob/1bdc185fbdb7541cb7b367876e70ab82eb757782/packages/schema/src/dialects/sqlite.ts#L40

    const remappings: Record<string, string> = {
      'select `name` from `sqlite_master` where sql LIKE "%AUTOINCREMENT%"':
        "SELECT `name` from `sqlite_master` WHERE sql LIKE '%AUTOINCREMENT%'",
    };

    if (typeof obj === "string") {
      obj = remappings[obj] ?? obj;
    } else if (typeof obj.sql === "string") {
      obj.sql = remappings[obj.sql] ?? obj.sql;
    }

    return super.query(conn, obj);
  }

  _driver() {
    return libsql;
  }
}

Object.assign(Client_Libsql.prototype, {
  dialect: "sqlite3",
  driverName: "sqlite3",
});

// Workaround for
// https://github.com/directus/directus/blob/1bdc185fbdb7541cb7b367876e70ab82eb757782/api/src/database/index.ts#L229
// https://github.com/directus/directus/blob/1bdc185fbdb7541cb7b367876e70ab82eb757782/packages/schema/src/index.ts#L31-L33

overrideNames(Client_Libsql, "Client_SQLite3");

Object.defineProperty(Client_Libsql, "name", {
  configurable: false,
  enumerable: true,
  value: "Client_SQLite3",
});

export function envWithLibsql(env: NodeJS.ProcessEnv) {
  const config: Record<string, any> = {
    DB_SYNC: "false",
    DB_SYNC_PERIOD: "30",

    ...env,

    // Override database driver
    DB_CLIENT: Client_Libsql,

    // These need to be set because of
    // https://github.com/directus/directus/blob/1bdc185fbdb7541cb7b367876e70ab82eb757782/api/src/database/index.ts#L85
    DB_HOST: "",
    DB_PORT: "",
    DB_DATABASE: "",
    DB_USER: "",
    DB_PASSWORD: "",

    // For some reason Directus will go nuts with libsql. I haven't dug into it just yet.
    PRESSURE_LIMITER_ENABLED: "false",
  };

  validateEnv(["DB_FILENAME"]);

  if (config.DB_SYNC != "false") {
    validateEnv(["DB_SYNC", "DB_SYNC_URL", "DB_SYNC_PERIOD"]);
  }

  Object.entries(config).forEach(([key, value]) => {
    if (typeof value === "function" && String(value) != "Client_SQLite3") {
      overrideNames(value, "function");
    }
    config[key] = value;
  });

  return config;
}

export function withLibsql(config: (env: NodeJS.ProcessEnv) => any) {
  return (env: NodeJS.ProcessEnv) => {
    return envWithLibsql(config?.(env) ?? env);
  };
}

function overrideNames(value: any, name: string) {
  const property = {
    writable: false,
    configurable: false,
    enumerable: true,
    value: () => name,
  };
  Object.defineProperties(value, {
    toString: property,
    [Symbol.toStringTag]: property,
    [Symbol.toPrimitive]: property,
  });
}
