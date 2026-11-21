export async function up(knex) {
  await knex.schema.createTable('schools', (t) => {
    t.uuid('id').primary();
    t.string('code', 64).notNullable().unique();
    t.string('name', 200).notNullable();
    t.string('timezone', 64).notNullable().defaultTo('Asia/Jakarta');
    t.string('service_hours', 200).notNullable().defaultTo('');
    t.jsonb('verified_contacts').notNullable().defaultTo('[]');
    t.boolean('guardian_consent_required').notNullable().defaultTo(false);
    t.boolean('active_handler_configured').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('account_code', 64).notNullable();
    t.string('login_email', 200);
    t.string('display_name', 120).notNullable();
    t.string('role', 24).notNullable();
    t.string('status', 32).notNullable().defaultTo('pending_activation');
    t.string('grade_group', 64);
    t.text('password_hash');
    t.timestamp('password_changed_at', { useTz: true });
    t.boolean('mfa_enabled').notNullable().defaultTo(false);
    t.text('mfa_secret_encrypted');
    t.jsonb('mfa_recovery_hashes');
    t.timestamps(true, true);

    t.unique(['school_id', 'account_code']);
    t.index(['school_id', 'role', 'status']);
    t.index(['school_id', 'grade_group']);
  });

  await knex.raw(
    "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'bk', 'superadmin'))"
  );
  await knex.raw(
    "ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('pending_activation', 'active', 'inactive', 'deletion_pending'))"
  );
  await knex.raw(
    'CREATE UNIQUE INDEX users_login_email_unique_idx ON users (LOWER(login_email)) WHERE login_email IS NOT NULL'
  );

  await knex.schema.createTable('user_sessions', (t) => {
    t.string('sid').primary();
    t.json('sess').notNullable();
    t.timestamp('expire', { precision: 6 }).notNullable();
  });
  await knex.raw('CREATE INDEX "IDX_session_expire" ON user_sessions (expire)');

  await knex.schema.createTable('account_tokens', (t) => {
    t.uuid('id').primary();
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('purpose', 32).notNullable();
    t.string('token_hash', 128).notNullable().unique();
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.timestamp('used_at', { useTz: true });
    t.uuid('issued_by_user_id');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['user_id', 'purpose']);
  });
  await knex.raw(
    "ALTER TABLE account_tokens ADD CONSTRAINT account_tokens_purpose_check CHECK (purpose IN ('activation', 'recovery'))"
  );

  await knex.schema.createTable('counselor_assignments', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('counselor_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('grade_group', 64).notNullable();
    t.string('period_label', 120).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);

    t.unique(['school_id', 'counselor_user_id', 'grade_group']);
  });

  await knex.schema.createTable('consent_policies', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('version', 32).notNullable();
    t.string('title', 200).notNullable();
    t.text('summary').notNullable();
    t.text('full_policy_text').notNullable();
    t.text('data_access_notice').notNullable();
    t.date('effective_date').notNullable();
    t.boolean('is_active').notNullable().defaultTo(false);
    t.uuid('created_by_user_id');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.unique(['school_id', 'version']);
  });

  await knex.schema.createTable('consents', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('policy_id').notNullable().references('id').inTable('consent_policies').onDelete('CASCADE');
    t.string('policy_version', 32).notNullable();
    t.string('status', 24).notNullable();
    t.jsonb('scope').notNullable().defaultTo('{}');
    t.boolean('guardian_verified').notNullable().defaultTo(false);
    t.string('guardian_reference', 120);
    t.timestamp('accepted_at', { useTz: true });
    t.timestamp('withdrawn_at', { useTz: true });
    t.timestamps(true, true);

    t.unique(['user_id', 'policy_id']);
    t.index(['school_id', 'status']);
  });
  await knex.raw(
    "ALTER TABLE consents ADD CONSTRAINT consents_status_check CHECK (status IN ('accepted', 'declined', 'withdrawn'))"
  );
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('consents');
  await knex.schema.dropTableIfExists('consent_policies');
  await knex.schema.dropTableIfExists('counselor_assignments');
  await knex.schema.dropTableIfExists('account_tokens');
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('schools');
}
