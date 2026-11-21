import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { decryptSensitiveText, encryptSensitiveText } from '../src/lib/encryption.js';
import { revokeAllUserSessions } from '../src/modules/auth/auth.service.js';
import { invalidateAllStudentWeekSnapshots } from '../src/modules/dashboard/aggregate-computation.service.js';
import { purgePersonalEntries } from '../src/modules/privacy/privacy.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BACKUP_TABLES = [
  'schools',
  'users',
  'counselor_assignments',
  'consent_policies',
  'consents',
  'mood_entries',
  'screening_instruments',
  'screening_responses',
  'journal_entries',
  'exercise_contents',
  'exercise_sessions',
  'tasks',
  'task_steps',
  'schedule_blocks',
  'reminder_preferences',
  'push_subscriptions',
  'weekly_reflections',
  'articles',
  'help_requests',
  'help_status_events',
  'help_acknowledgements',
  'group_feedback',
  'activity_metadata_events',
  'aggregate_snapshots',
  'audit_events',
  'governance_reviews',
  'deletion_requests',
  'deleted_account_tombstones',
];

export async function exportEncryptedBackup(db, keyRing) {
  const dump = {
    createdAt: new Date().toISOString(),
    tables: {},
  };

  for (const table of BACKUP_TABLES) {
    dump.tables[table] = await db(table).select('*');
  }

  return encryptSensitiveText(JSON.stringify(dump), keyRing);
}

export async function restoreEncryptedBackup(
  db,
  keyRing,
  encryptedPayload,
  externalTombstones = [],
  externalRequests = []
) {
  const raw = decryptSensitiveText(encryptedPayload, keyRing);
  const dump = JSON.parse(raw);

  await db.transaction(async (trx) => {
    // Preserve the live erasure ledger BEFORE replacing tables with an older backup.
    await trx.raw(
      'LOCK TABLE deleted_account_tombstones, deletion_requests IN SHARE ROW EXCLUSIVE MODE'
    );
    const liveTombstones = await trx('deleted_account_tombstones').select('*');
    const liveRequests = await trx('deletion_requests').select('*');
    await trx('user_sessions').del();
    for (let i = BACKUP_TABLES.length - 1; i >= 0; i--) {
      await trx(BACKUP_TABLES[i]).del();
    }

    for (const table of BACKUP_TABLES) {
      const rows = dump.tables?.[table] || [];
      if (rows.length > 0) {
        const prepared = rows.map((row) => {
          const out = { ...row };
          for (const [k, v] of Object.entries(out)) {
            if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
              out[k] = JSON.stringify(v);
            }
          }
          return out;
        });
        await trx(table).insert(prepared);
      }
    }

    const preservedTombstones = [...liveTombstones, ...externalTombstones];
    if (preservedTombstones.length > 0) {
      await trx('deleted_account_tombstones')
        .insert(Array.from(new Map(preservedTombstones.map((row) => [row.user_id, row])).values()))
        .onConflict('user_id')
        .ignore();
    }
    const schoolIdsInBackup = new Set((dump.tables.schools || []).map((s) => s.id));
    const preservedRequests = Array.from(
      new Map(
        [...liveRequests, ...externalRequests]
          .filter((r) => schoolIdsInBackup.has(r.school_id))
          .map((r) => [r.id, r])
      ).values()
    );
    if (preservedRequests.length)
      await trx('deletion_requests').insert(preservedRequests).onConflict('id').merge();

    // Wajib sesuai PRD Bagian 14.2 & Tasklist T65:
    // Terapkan kembali daftar penghapusan (tombstones) sebelum akses dibuka kembali!
    const tombstones = await trx('deleted_account_tombstones').select('user_id', 'school_id');
    const pendingDeletions = await trx('deletion_requests')
      .where({ scope: 'account' })
      .select('user_id', 'school_id');

    const idsToPurge = Array.from(
      new Set([...tombstones.map((t) => t.user_id), ...pendingDeletions.map((d) => d.user_id)])
    );

    for (const uid of idsToPurge) {
      await revokeAllUserSessions(trx, uid);
      await trx('users').where({ id: uid }).del();
    }

    const entryErasures = await trx('deletion_requests').where({ scope: 'entries' });
    for (const erasure of entryErasures) {
      await purgePersonalEntries(trx, erasure.user_id, erasure.requested_at);
    }

    const schoolIds = Array.from(
      new Set([...tombstones, ...pendingDeletions, ...entryErasures].map((t) => t.school_id))
    );
    for (const sid of schoolIds) {
      await invalidateAllStudentWeekSnapshots(trx, sid);
    }
  });

  return { restoredAt: new Date().toISOString(), tablesCount: BACKUP_TABLES.length };
}

async function runCli() {
  const env = loadEnv();
  const db = createDatabase(env.DATABASE_ADMIN_URL || env.DATABASE_URL);
  const mode = process.argv[2];

  try {
    if (mode === '--verify') {
      const backupDir = path.resolve(__dirname, '../../.local/backups');
      fs.mkdirSync(backupDir, { recursive: true });
      const encrypted = await exportEncryptedBackup(db, env.keyRing);
      const outFile = path.join(backupDir, 'verify-backup.enc');
      fs.writeFileSync(outFile, encrypted, 'utf8');
      const result = await restoreEncryptedBackup(
        db,
        env.keyRing,
        fs.readFileSync(outFile, 'utf8')
      );
      console.log('Backup terenkripsi & uji restore + tombstone berhasil:', result);
    } else if (mode === 'export') {
      const outPath = process.argv[3] || path.resolve(__dirname, '../../.local/backups/backup.enc');
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      const encrypted = await exportEncryptedBackup(db, env.keyRing);
      fs.writeFileSync(outPath, encrypted, 'utf8');
      console.log('Backup terenkripsi disimpan di:', outPath);
    } else if (mode === 'export-ledger') {
      const outPath = process.argv[3];
      if (!outPath) throw new Error('Tentukan path ledger terenkripsi di penyimpanan terpisah.');
      const ledger = {
        tombstones: await db('deleted_account_tombstones').select('*'),
        deletionRequests: await db('deletion_requests').select('*'),
      };
      fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
      fs.writeFileSync(outPath, encryptSensitiveText(JSON.stringify(ledger), env.keyRing), 'utf8');
      console.log('Ledger penghapusan terenkripsi disimpan.');
    } else if (mode === 'restore') {
      const inPath = process.argv[3];
      if (!inPath || !fs.existsSync(inPath)) {
        throw new Error('File backup tidak ditemukan.');
      }
      const ledgerPath = process.argv[4];
      const ledger = ledgerPath
        ? JSON.parse(decryptSensitiveText(fs.readFileSync(ledgerPath, 'utf8'), env.keyRing))
        : {};
      const res = await restoreEncryptedBackup(
        db,
        env.keyRing,
        fs.readFileSync(inPath, 'utf8'),
        ledger.tombstones || [],
        ledger.deletionRequests || []
      );
      console.log('Restore selesai:', res);
    } else if (mode === 'inspect') {
      const inPath = process.argv[3];
      if (!inPath || !fs.existsSync(inPath)) {
        throw new Error('File backup tidak ditemukan.');
      }
      const raw = decryptSensitiveText(fs.readFileSync(inPath, 'utf8'), env.keyRing);
      const dump = JSON.parse(raw);
      const rowCounts = {};
      for (const [tbl, rows] of Object.entries(dump.tables || {})) {
        rowCounts[tbl] = Array.isArray(rows) ? rows.length : 0;
      }
      console.log('Informasi Metadata Backup Terenkripsi:');
      console.log('Waktu Pembuatan:', dump.createdAt);
      console.log('Jumlah Tabel:', Object.keys(dump.tables || {}).length);
      console.log('Rincian Baris:', rowCounts);
    } else if (mode === 'prune-local') {
      const targetDir = process.argv[3] || path.resolve(__dirname, '../../.local/backups');
      const days = parseInt(process.argv[4] || '30', 10);
      if (!fs.existsSync(targetDir)) {
        console.log('Direktori tidak ditemukan:', targetDir);
        return;
      }
      const cutoffMs = Date.now() - days * 24 * 3600 * 1000;
      const files = fs.readdirSync(targetDir);
      let prunedCount = 0;
      for (const file of files) {
        if (file.endsWith('.enc')) {
          const fullPath = path.join(targetDir, file);
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs < cutoffMs) {
            fs.unlinkSync(fullPath);
            console.log(`Dibersihkan: ${file} (usia > ${days} hari)`);
            prunedCount++;
          }
        }
      }
      console.log(`Pembersihan backup lokal selesai: ${prunedCount} berkas dibersihkan.`);
    } else {
      console.error(
        'Gunakan: --verify | export <path> | export-ledger <path> | restore <path> [ledger-terbaru] | inspect <path> | prune-local <dir> [hari]'
      );
      process.exitCode = 1;
    }
  } finally {
    await db.destroy();
  }
}

const isCli = process.argv[1] && process.argv[1].endsWith('backup-restore.mjs');
if (isCli) {
  runCli().catch((err) => {
    console.error('Backup/restore gagal:', err.message);
    process.exit(1);
  });
}
