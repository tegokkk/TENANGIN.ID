export async function up(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('nisn', 20);
    t.index(['school_id', 'nisn']);
  });
  await knex.raw(
    'CREATE UNIQUE INDEX users_nisn_unique_idx ON users (school_id, LOWER(nisn)) WHERE nisn IS NOT NULL'
  );
}

export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS users_nisn_unique_idx');
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('nisn');
  });
}
