// Validate data as well as the database name: a renamed fixture database is unsafe too.
export async function assertNoDummyData(db) {
  const fixtureSchool = await db('schools')
    .whereIn('code', ['SMA-CONTOH-01', 'SMA-MITRA-02'])
    .first();
  const simulation = await db('screening_instruments').where({ is_simulation: true }).first();
  if (fixtureSchool || simulation) {
    throw new Error(
      'Database masih berisi sekolah fixture atau instrumen simulasi. Layanan production tidak dijalankan.'
    );
  }
}
