export async function up(knex) {
  await knex.schema.createTable('mood_entries', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('local_date').notNullable();
    t.string('school_timezone', 64).notNullable();
    t.string('mood_code', 32).notNullable();
    t.string('mood_label', 64).notNullable();
    t.smallint('mood_score').notNullable();
    t.smallint('pressure_level');
    t.boolean('skipped').notNullable().defaultTo(false);
    t.timestamps(true, true);

    t.unique(['user_id', 'local_date']);
    t.index(['school_id', 'local_date']);
  });
  await knex.raw('ALTER TABLE mood_entries ADD CONSTRAINT mood_score_range CHECK (mood_score BETWEEN 1 AND 5)');
  await knex.raw(
    'ALTER TABLE mood_entries ADD CONSTRAINT mood_pressure_range CHECK (pressure_level IS NULL OR pressure_level BETWEEN 0 AND 10)'
  );

  await knex.schema.createTable('screening_instruments', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('code', 64).notNullable();
    t.string('version', 32).notNullable();
    t.string('title', 200).notNullable();
    t.text('description').notNullable();
    t.string('reference_period', 120).notNullable();
    t.boolean('is_simulation').notNullable().defaultTo(true);
    t.boolean('is_approved').notNullable().defaultTo(false);
    t.string('approval_ref', 120);
    t.string('status', 24).notNullable().defaultTo('draft');
    t.jsonb('items').notNullable();
    t.jsonb('scoring_rules').notNullable();
    t.timestamps(true, true);

    t.unique(['school_id', 'code', 'version']);
  });

  await knex.schema.createTable('screening_responses', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('instrument_id').notNullable().references('id').inTable('screening_instruments').onDelete('CASCADE');
    t.string('instrument_version', 32).notNullable();
    t.boolean('is_simulation').notNullable().defaultTo(true);
    t.text('answers_encrypted').notNullable();
    t.decimal('computed_score', 8, 2);
    t.string('score_status', 24).notNullable();
    t.string('interpretation_label', 160).notNullable();
    t.text('support_message').notNullable();
    t.date('local_date').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index(['user_id', 'created_at']);
    t.index(['instrument_id', 'instrument_version']);
  });

  await knex.schema.createTable('journal_entries', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('situation_encrypted').notNullable();
    t.text('thoughts_encrypted').notNullable();
    t.text('feelings_encrypted').notNullable();
    t.jsonb('emotion_tags').notNullable().defaultTo('[]');
    t.text('alternative_encrypted');
    t.integer('version').notNullable().defaultTo(1);
    t.date('local_date').notNullable();
    t.timestamps(true, true);

    t.index(['user_id', 'updated_at']);
  });

  await knex.schema.createTable('exercise_contents', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('slug', 120).notNullable();
    t.string('category', 32).notNullable();
    t.string('title', 200).notNullable();
    t.string('subtitle', 260).notNullable();
    t.integer('duration_seconds').notNullable();
    t.integer('version').notNullable().defaultTo(1);
    t.string('status', 24).notNullable().defaultTo('draft');
    t.jsonb('instructions').notNullable();
    t.text('stop_notice').notNullable();
    t.string('audio_url', 300);
    t.string('source_reference', 300).notNullable();
    t.string('media_rights', 200).notNullable();
    t.string('reviewer_ref', 160);
    t.timestamps(true, true);

    t.unique(['school_id', 'slug', 'version']);
  });

  await knex.schema.createTable('exercise_sessions', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('exercise_id').notNullable().references('id').inTable('exercise_contents').onDelete('RESTRICT');
    t.integer('exercise_version').notNullable();
    t.string('status', 24).notNullable();
    t.integer('active_seconds').notNullable().defaultTo(0);
    t.timestamp('started_at', { useTz: true }).notNullable();
    t.timestamp('ended_at', { useTz: true });
    t.date('local_date').notNullable();
    t.timestamps(true, true);

    t.index(['user_id', 'started_at']);
  });
  await knex.raw(
    "ALTER TABLE exercise_sessions ADD CONSTRAINT exercise_sessions_status_check CHECK (status IN ('started', 'paused', 'completed', 'stopped'))"
  );

  await knex.schema.createTable('tasks', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title', 120).notNullable();
    t.string('notes', 500);
    t.date('target_date');
    t.integer('estimated_minutes');
    t.boolean('is_important').notNullable().defaultTo(false);
    t.boolean('is_urgent').notNullable().defaultTo(false);
    t.string('status', 24).notNullable().defaultTo('pending');
    t.timestamp('completed_at', { useTz: true });
    t.timestamps(true, true);

    t.index(['user_id', 'target_date', 'status']);
  });

  await knex.schema.createTable('task_steps', (t) => {
    t.uuid('id').primary();
    t.uuid('task_id').notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title', 160).notNullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_done').notNullable().defaultTo(false);
    t.timestamps(true, true);

    t.index(['task_id', 'sort_order']);
  });

  await knex.schema.createTable('schedule_blocks', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('block_type', 24).notNullable();
    t.string('title', 120).notNullable();
    t.date('local_date').notNullable();
    t.string('start_time', 10).notNullable();
    t.string('end_time', 10).notNullable();
    t.timestamps(true, true);

    t.index(['user_id', 'local_date']);
  });

  await knex.schema.createTable('reminder_preferences', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.boolean('enabled').notNullable().defaultTo(false);
    t.string('reminder_type', 48).notNullable().defaultTo('jeda_belajar');
    t.jsonb('days_of_week').notNullable().defaultTo('[1,2,3,4,5]');
    t.string('preferred_time', 10).notNullable().defaultTo('16:00');
    t.string('timezone', 64).notNullable().defaultTo('Asia/Jakarta');
    t.string('quiet_hours_start', 10).notNullable().defaultTo('21:30');
    t.string('quiet_hours_end', 10).notNullable().defaultTo('06:00');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('notification_deliveries', (t) => {
    t.uuid('id').primary();
    t.uuid('reminder_id')
      .notNullable()
      .references('id')
      .inTable('reminder_preferences')
      .onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('occurrence_key', 120).notNullable();
    t.string('channel', 24).notNullable().defaultTo('in_app');
    t.string('status', 24).notNullable().defaultTo('delivered');
    t.timestamp('delivered_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.unique(['user_id', 'occurrence_key']);
  });

  await knex.schema.createTable('weekly_reflections', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('week_start').notNullable();
    t.date('week_end').notNullable();
    t.string('school_timezone', 64).notNullable();
    t.text('helpful_encrypted').notNullable();
    t.text('obstacle_encrypted').notNullable();
    t.text('plan_encrypted').notNullable();
    t.jsonb('strategy_tags').notNullable().defaultTo('[]');
    t.integer('version').notNullable().defaultTo(1);
    t.timestamps(true, true);

    t.unique(['user_id', 'week_start']);
    t.index(['school_id', 'week_start']);
  });

  await knex.schema.createTable('articles', (t) => {
    t.uuid('id').primary();
    t.uuid('school_id').notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('slug', 140).notNullable();
    t.string('topic', 80).notNullable();
    t.string('title', 200).notNullable();
    t.string('summary', 400).notNullable();
    t.text('body').notNullable();
    t.jsonb('tags').notNullable().defaultTo('[]');
    t.integer('version').notNullable().defaultTo(1);
    t.string('status', 24).notNullable().defaultTo('draft');
    t.string('source_reference', 300).notNullable();
    t.string('media_rights', 200).notNullable();
    t.string('reviewer_ref', 160);
    t.timestamp('published_at', { useTz: true });
    t.timestamps(true, true);

    t.unique(['school_id', 'slug', 'version']);
    t.index(['school_id', 'status']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('articles');
  await knex.schema.dropTableIfExists('weekly_reflections');
  await knex.schema.dropTableIfExists('notification_deliveries');
  await knex.schema.dropTableIfExists('reminder_preferences');
  await knex.schema.dropTableIfExists('schedule_blocks');
  await knex.schema.dropTableIfExists('task_steps');
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('exercise_sessions');
  await knex.schema.dropTableIfExists('exercise_contents');
  await knex.schema.dropTableIfExists('journal_entries');
  await knex.schema.dropTableIfExists('screening_responses');
  await knex.schema.dropTableIfExists('screening_instruments');
  await knex.schema.dropTableIfExists('mood_entries');
}
