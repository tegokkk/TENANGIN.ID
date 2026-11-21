export async function up(knex) {
  await knex.schema.alterTable('exercise_sessions', (t) =>
    t.integer('duration_seconds').notNullable().defaultTo(180)
  );
  await knex.raw(
    'UPDATE exercise_sessions s SET duration_seconds = e.duration_seconds FROM exercise_contents e WHERE s.exercise_id = e.id'
  );
}
export async function down(knex) {
  await knex.schema.alterTable('exercise_sessions', (t) => t.dropColumn('duration_seconds'));
}
