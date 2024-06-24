
declare module "knex/lib/dialects/better-sqlite3" {
  import { Knex, Client } from "knex";
  import { Database } from "libsql";
  import DatabaseConstructor from "libsql";

  export type Config = Record<any, any>;

  export default class Client_BetterSQLite3 {
    driver: typeof DatabaseConstructor;

    connectionSettings: Config;

    connection: Database;

    constructor(config: Config);

    //async acquireRawConnection(): Promise<Knex.Connection>;

    driver(file: string, config: Config): Database;

    query(conn: Database, obj: string | { sql: string }): Promise<any>;
  }
}
