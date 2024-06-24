# Directus with libsql

Experimental/PoC support for `libsql` in `Directus`.

> [!CAUTION]
> This is an **experimental** project and consists in workarounds and small patches to make it work without modifying the core of Directus.
> In order to make Directus work nicely with libsql, some changes need to land in both Directus and libsql first.

# Running

## With Docker

> Note that the published image is preconfigured to make it easier to test.

`docker run --rm -it -p 8055:8055 linefusion/directus-libsql:latest`

To run with Turso, set these variables:

```env
DB_SYNC=true
DB_SYNC_URL=libsql://<project>-<org>.turso.io
DB_SYNC_PERIOD=60
DB_AUTH_TOKEN=<your-token>
```

Embedded replica will live inside `/directus/database` folder.

## Create a test project

Run `npm init @linefusion/directus-libsql`.

Inside the project:

- `pnpm directus` is an alias to Directus CLI with the config file set.
- `pnpm bootstrap` is an alias to `directus bootstrap` with the config file set.
- `pnpm start` is an alias to `directus start` with the config file set.

## Manual installation

Example are given using `pnpm`, port it to your own package manager of choice.

### Create a normal Directus project

- Create a Directus project `pnpm create directus-project some-project`
  - Choose SQLite as the database
  - Set `./database.sqlite` as your database filename
  - Choose email and password

### Install libsql driver

- Install these packages in your project:
  - `pnpm install @linefusion/directus-libsql`
  - `pnpm install libsql@0.4.0-pre.7`
- Create a `config.js` inside of it:

  ```js
  const { withLibsql } = require("@linefusion/directus-libsql");
  module.exports = withLibsql();
  ```

- Configure your `.env` file or set these environment variables:
  - `DB_FILENAME` - where your local sqlite database will live.
  - `DB_SYNC` - if you want to sync changes (true/false).
    - `DB_SYNC_URL` - remote url to sync changes to/from (url).
    - `DB_SYNC_PERIOD` - period to automatically sync changes (in seconds, default 60).
    - `DB_AUTH_TOKEN` - token for syncing (string).

- Run Directus with `CONFIG_PATH` pointing to the location fo the `config.js` you just created.

## Examples

Check examples folder. Each example has an associated script in the root package.

To run an example use `pnpm example:<name>` command (it's 'an alias to `directus` cli).

# Additional Work

- `libsql` needs a fix on the parser in order to behave exactly like SQLite.
  - See issue [here](https://github.com/tursodatabase/libsql/issues/1489)

- Directus needs to add support for libsql since databases are all hardcoded.
  - See `getDatabaseClient` function [here](https://github.com/directus/directus/blob/1bdc185fbdb7541cb7b367876e70ab82eb757782/api/src/database/index.ts#L229)
  - See `getDatabase` function [here](https://github.com/directus/directus/blob/1bdc185fbdb7541cb7b367876e70ab82eb757782/api/src/database/index.ts#L47-L50), [here](https://github.com/directus/directus/blob/1bdc185fbdb7541cb7b367876e70ab82eb757782/api/src/database/index.ts#L84-L85) and [here](https://github.com/directus/directus/blob/1bdc185fbdb7541cb7b367876e70ab82eb757782/api/src/database/index.ts#L113-L124)
  - See `createInspector` [here](https://github.com/directus/directus/blob/1bdc185fbdb7541cb7b367876e70ab82eb757782/packages/schema/src/index.ts#L31-L33)
  - See `createDBconnection` [here](https://github.com/directus/directus/blob/1bdc185fbdb7541cb7b367876e70ab82eb757782/api/src/cli/utils/create-db-connection.ts#L21)

- Directus could make it easier to use `libsql` until [referenced issue](https://github.com/tursodatabase/libsql/issues/1489) in `libsql` is fixed
  - See `columnInfo` [here](https://github.com/directus/directus/blob/1bdc185fbdb7541cb7b367876e70ab82eb757782/packages/schema/src/dialects/sqlite.ts#L162)

    - ```ts
      await this.knex.select('name').from('sqlite_master').whereRaw(`sql LIKE "%AUTOINCREMENT%"`)
      ```

      to

      ```ts
      await this.knex.select('name').from('sqlite_master').whereLike('sql', '%AUTOINCREMENT%')
      ```
