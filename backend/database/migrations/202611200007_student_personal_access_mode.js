export async function up(knex) {
  await knex.schema.alterTable('schools', (t) => {
    t.string('personal_access_mode', 24).notNullable().defaultTo('consent');
  });
  await knex.raw(
    "ALTER TABLE schools ADD CONSTRAINT schools_personal_access_mode_check CHECK (personal_access_mode IN ('consent', 'account_approval'))"
  );
  await knex.schema.alterTable('users', (t) => {
    t.timestamp('personal_access_paused_at', { useTz: true });
  });
}

export async function down(knex) {
  await knex.schema.alterTable('users', (t) => t.dropColumn('personal_access_paused_at'));
  await knex.raw('ALTER TABLE schools DROP CONSTRAINT schools_personal_access_mode_check');
  await knex.schema.alterTable('schools', (t) => t.dropColumn('personal_access_mode'));
}
