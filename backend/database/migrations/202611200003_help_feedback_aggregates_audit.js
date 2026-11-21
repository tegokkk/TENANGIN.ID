export async function up(knex) {
  await knex.schema.createTable('help_requests', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('handler_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('requested_counselor', 160);
    t.string('preferred_time', 120);
    t.text('topic_message_encrypted');
    t.text('contact_encrypted');
    t.string('status', 24).notNullable().defaultTo('submitted');
    t.string('idempotency_key', 128).notNullable();
    t.timestamps(true, true);

    t.unique(['student_user_id', 'idempotency_key']);
    t.index(['school_id', 'status', 'created_at']);
  });
  await knex.raw(
    "ALTER TABLE help_requests ADD CONSTRAINT help_requests_status_check CHECK (status IN ('submitted', 'acknowledged', 'follow_up', 'closed', 'cancelled'))"
  );

  await knex.schema.createTable('help_status_events', (t) => {
    t.uuid('id').primary();
    t.uuid('help_request_id')
      .notNullable()
      .references('id')
      .inTable('help_requests')
      .onDelete('CASCADE');
    t.uuid('actor_user_id');
    t.string('actor_role', 24).notNullable();
    t.string('from_status', 24);
    t.string('to_status', 24).notNullable();
    t.string('note', 300);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['help_request_id', 'created_at']);
  });

  await knex.schema.createTable('help_acknowledgements', (t) => {
    t.uuid('id').primary();
    t.uuid('help_request_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('help_requests')
      .onDelete('CASCADE');
    t.uuid('author_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.text('message').notNullable();
    t.string('location_info', 200);
    t.string('schedule_info', 200);
    t.integer('version').notNullable().defaultTo(1);
    t.jsonb('revision_history').notNullable().defaultTo('[]');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('group_feedback', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('author_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('target_group', 64).notNullable();
    t.string('period_label', 120).notNullable();
    t.string('title', 200).notNullable();
    t.text('body').notNullable();
    t.string('status', 24).notNullable().defaultTo('draft');
    t.timestamp('published_at', { useTz: true });
    t.timestamps(true, true);

    t.index(['school_id', 'target_group', 'status']);
  });

  await knex.schema.createTable('activity_metadata_events', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('grade_group', 64).notNullable();
    t.string('activity_type', 32).notNullable();
    t.string('activity_label', 120).notNullable();
    t.string('status_label', 80).notNullable();
    t.integer('duration_seconds');
    t.date('local_date').notNullable();
    t.timestamp('occurred_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['school_id', 'grade_group', 'occurred_at']);
    t.index(['school_id', 'activity_type', 'occurred_at']);
  });

  await knex.schema.createTable('aggregate_snapshots', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('scope_group', 64).notNullable();
    t.date('week_start').notNullable();
    t.date('week_end').notNullable();
    t.string('metric_key', 64).notNullable();
    t.string('metric_label', 120).notNullable();
    t.string('formula_version', 16).notNullable().defaultTo('v1');
    t.string('instrument_version', 32);
    t.integer('contributor_count').notNullable().defaultTo(0);
    t.decimal('metric_value', 10, 2);
    t.jsonb('metric_payload');
    t.boolean('is_suppressed').notNullable().defaultTo(true);
    t.boolean('invalidated').notNullable().defaultTo(false);
    t.timestamp('computed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.unique(['school_id', 'scope_group', 'week_start', 'metric_key', 'formula_version']);
    t.index(['school_id', 'week_start', 'invalidated']);
  });

  await knex.schema.createTable('audit_events', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').references('id').inTable('schools').onDelete('SET NULL');
    t.uuid('actor_user_id');
    t.string('actor_code', 64);
    t.string('actor_role', 24).notNullable();
    t.string('action', 80).notNullable();
    t.string('target_type', 64).notNullable();
    t.string('target_id', 200);
    t.string('outcome', 24).notNullable();
    t.string('summary', 300).notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['school_id', 'created_at']);
  });

  await knex.schema.createTable('deletion_requests', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.string('account_code', 64).notNullable();
    t.string('scope', 24).notNullable();
    t.string('status', 24).notNullable().defaultTo('pending');
    t.timestamp('requested_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('completed_at', { useTz: true });
    t.string('evidence_summary', 300);

    t.index(['status', 'requested_at']);
  });

  await knex.schema.createTable('deleted_account_tombstones', (t) => {
    t.uuid('user_id').primary();
    t.uuid('school_id').notNullable();
    t.string('account_code_hash', 128).notNullable();
    t.timestamp('deleted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenangin_app') THEN
    CREATE SCHEMA IF NOT EXISTS pgboss;
    GRANT USAGE, CREATE ON SCHEMA pgboss TO tenangin_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tenangin_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tenangin_app;
  END IF;
END
$$;
`);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('deleted_account_tombstones');
  await knex.schema.dropTableIfExists('deletion_requests');
  await knex.schema.dropTableIfExists('audit_events');
  await knex.schema.dropTableIfExists('aggregate_snapshots');
  await knex.schema.dropTableIfExists('activity_metadata_events');
  await knex.schema.dropTableIfExists('group_feedback');
  await knex.schema.dropTableIfExists('help_acknowledgements');
  await knex.schema.dropTableIfExists('help_status_events');
  await knex.schema.dropTableIfExists('help_requests');
}
