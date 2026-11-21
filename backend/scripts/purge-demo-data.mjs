import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';

// Never targets a live database or decides which accounts to keep by account code.
export async function purgeDummyDatabase(db, { expectedDatabase, apply = false }) {
  if (
    !expectedDatabase ||
    (expectedDatabase !== 'tenangin_demo' &&
      (!/^tenangin(?:_[a-z0-9]+)*_test$/.test(expectedDatabase) ||
        /prod|pilot/i.test(expectedDatabase)))
  ) {
    throw new Error(
      'Pembersihan hanya diizinkan untuk database dummy atau test yang disebut eksplisit.'
    );
  }
  return db.transaction(async (trx) => {
    await trx.raw("SET LOCAL lock_timeout = '5s'");
    const actual = await trx.raw('SELECT current_database() AS name');
    if (actual.rows[0].name !== expectedDatabase) throw new Error('Target database tidak cocok.');
    await trx.raw('LOCK TABLE public.schools IN ACCESS EXCLUSIVE MODE');
    const unknown = await trx('schools')
      .whereNotIn('code', ['SMA-CONTOH-01', 'SMA-MITRA-02'])
      .first();
    if (unknown)
      throw new Error('Ada sekolah di luar fixture yang dikenal; tidak ada data yang dihapus.');
    const tables = await trx('information_schema.tables')
      .select('table_name')
      .where({ table_schema: 'public', table_type: 'BASE TABLE' })
      .whereNotIn('table_name', ['knex_migrations', 'knex_migrations_lock'])
      .orderBy('table_name');
    const before = {};
    for (const { table_name: table } of tables) {
      before[table] = Number((await trx(table).count('* as count').first()).count);
    }
    if (apply && tables.length) {
      await trx.raw(
        `TRUNCATE TABLE ${tables.map(() => '??').join(', ')} RESTART IDENTITY`,
        tables.map(({ table_name: table }) => `public.${table}`)
      );
    }
    return {
      database: expectedDatabase,
      applied: apply,
      before,
      remaining: apply ? 0 : Object.values(before).reduce((a, b) => a + b, 0),
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const expectedDatabase = args.find((arg) => arg.startsWith('--database='))?.slice(11);
  const env = loadEnv();
  const connection = env.DATABASE_ADMIN_URL || env.DATABASE_URL;
  const target = new URL(connection);
  if (target.hostname !== '127.0.0.1' || target.port !== '5433') {
    throw new Error('CLI pembersihan hanya boleh memakai cluster lokal proyek 127.0.0.1:5433.');
  }
  const db = createDatabase(connection);
  try {
    console.log(
      JSON.stringify(
        await purgeDummyDatabase(db, { expectedDatabase, apply: args.includes('--apply') }),
        null,
        2
      )
    );
  } finally {
    await db.destroy();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
