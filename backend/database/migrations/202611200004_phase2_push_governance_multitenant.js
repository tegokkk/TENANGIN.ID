export async function up(knex) {
  await knex.schema.alterTable('schools', (t) => {
    t.integer('max_students').notNullable().defaultTo(500);
    t.integer('retention_days').notNullable().defaultTo(90);
    t.boolean('is_active').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('push_subscriptions', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('endpoint').notNullable();
    t.text('p256dh_encrypted').notNullable();
    t.text('auth_encrypted').notNullable();
    t.string('user_agent_label', 160).notNullable().defaultTo('Perangkat Browser');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('last_tested_at', { useTz: true });
    t.timestamp('last_delivered_at', { useTz: true });
    t.timestamp('revoked_at', { useTz: true });
    t.timestamps(true, true);

    t.unique(['user_id', 'endpoint']);
    t.index(['school_id', 'user_id', 'is_active']);
  });

  await knex.schema.createTable('governance_reviews', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('domain_code', 48).notNullable();
    t.string('title', 200).notNullable();
    t.text('scope_summary').notNullable();
    t.string('status', 24).notNullable().defaultTo('pending_review');
    t.string('reviewer_name', 160);
    t.string('reviewer_role', 48);
    t.text('decision_notes');
    t.text('revision_notes');
    t.timestamp('reviewed_at', { useTz: true });
    t.uuid('updated_by_user_id');
    t.integer('version').notNullable().defaultTo(1);
    t.timestamps(true, true);

    t.unique(['school_id', 'domain_code']);
    t.index(['school_id', 'status']);
  });
  await knex.raw(
    "ALTER TABLE governance_reviews ADD CONSTRAINT governance_reviews_status_check CHECK (status IN ('pending_review', 'needs_revision', 'approved', 'deferred'))"
  );

  // Indeks komposit untuk optimasi kapasitas kueri & perluasan multi-sekolah (L05)
  await knex.schema.alterTable('activity_metadata_events', (t) => {
    t.index(['school_id', 'user_id', 'occurred_at'], 'idx_activity_meta_school_user_time');
  });
  await knex.schema.alterTable('audit_events', (t) => {
    t.index(['school_id', 'action', 'created_at'], 'idx_audit_school_action_time');
  });
  await knex.schema.alterTable('journal_entries', (t) => {
    t.index(['school_id', 'user_id', 'updated_at'], 'idx_journals_school_user_updated');
  });
  await knex.schema.alterTable('help_requests', (t) => {
    t.index(['school_id', 'student_user_id', 'created_at'], 'idx_help_school_student_time');
  });

  await knex.raw(`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenangin_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tenangin_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tenangin_app;
  END IF;
END
$$;
`);
}

export async function down(knex) {
  await knex.schema.alterTable('help_requests', (t) => {
    t.dropIndex(['school_id', 'student_user_id', 'created_at'], 'idx_help_school_student_time');
  });
  await knex.schema.alterTable('journal_entries', (t) => {
    t.dropIndex(['school_id', 'user_id', 'updated_at'], 'idx_journals_school_user_updated');
  });
  await knex.schema.alterTable('audit_events', (t) => {
    t.dropIndex(['school_id', 'action', 'created_at'], 'idx_audit_school_action_time');
  });
  await knex.schema.alterTable('activity_metadata_events', (t) => {
    t.dropIndex(['school_id', 'user_id', 'occurred_at'], 'idx_activity_meta_school_user_time');
  });

  await knex.schema.dropTableIfExists('governance_reviews');
  await knex.schema.dropTableIfExists('push_subscriptions');
  await knex.schema.alterTable('schools', (t) => {
    t.dropColumn('max_students');
    t.dropColumn('retention_days');
    t.dropColumn('is_active');
  });
}
