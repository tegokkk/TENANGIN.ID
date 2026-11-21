import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productionProfile =
  process.env.NODE_ENV === 'production' ||
  process.argv.includes('--env=production') ||
  process.argv.some((arg, index) => arg === '--env' && process.argv[index + 1] === 'production');
dotenv.config({ path: path.resolve(__dirname, productionProfile ? '.env.production' : '.env') });

const connectionString =
  process.env.DATABASE_ADMIN_URL ||
  process.env.DATABASE_URL ||
  (productionProfile
    ? undefined
    : 'postgres://tenangin_admin:tenangin_admin_dev@127.0.0.1:5433/tenangin_production');

if (productionProfile && (!connectionString || /\/tenangin_demo(?:\?|$)/i.test(connectionString))) {
  throw new Error('Migrasi production membutuhkan koneksi database production tersendiri.');
}

const testConnectionString =
  process.env.TEST_DATABASE_URL ||
  'postgres://tenangin_admin:tenangin_admin_dev@127.0.0.1:5433/tenangin_test';

const baseConfig = {
  client: 'pg',
  migrations: {
    directory: path.resolve(__dirname, 'database/migrations'),
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.resolve(__dirname, 'database/seeds'),
  },
};

export default {
  development: {
    ...baseConfig,
    connection: connectionString,
  },
  demo: {
    ...baseConfig,
    connection: connectionString,
  },
  test: {
    ...baseConfig,
    connection: testConnectionString,
  },
  production: {
    ...baseConfig,
    connection: connectionString,
    pool: { min: 2, max: 10 },
  },
};
