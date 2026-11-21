export async function up(knex) {
  const duplicates = await knex('users')
    .select(knex.raw('LOWER(nisn) AS normalized'))
    .whereNotNull('nisn')
    .groupByRaw('LOWER(nisn)')
    .havingRaw('COUNT(*) > 1');
  if (duplicates.length)
    throw new Error(
      'Terdapat NISN ganda lintas sekolah; periksa sebelum mengaktifkan pendaftaran.'
    );
  await knex.schema.alterTable('users', (t) => {
    t.string('registration_status', 16);
    t.timestamp('registration_submitted_at', { useTz: true });
    t.timestamp('registration_reviewed_at', { useTz: true });
    t.uuid('registration_reviewer_id').references('id').inTable('users').onDelete('SET NULL');
    t.index(['school_id', 'registration_status', 'created_at'], 'users_registration_queue_idx');
  });
  await knex.raw(
    "ALTER TABLE users ADD CONSTRAINT users_registration_status_check CHECK (registration_status IS NULL OR registration_status IN ('pending', 'approved', 'rejected'))"
  );
  await knex.raw(
    'CREATE UNIQUE INDEX users_nisn_global_unique_idx ON users (LOWER(nisn)) WHERE nisn IS NOT NULL'
  );
}

export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS users_nisn_global_unique_idx');
  await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_registration_status_check');
  await knex.raw('DROP INDEX IF EXISTS users_registration_queue_idx');
  await knex.schema.alterTable('users', (t) => {
    t.dropColumns(
      'registration_status',
      'registration_submitted_at',
      'registration_reviewed_at',
      'registration_reviewer_id'
    );
  });
}
