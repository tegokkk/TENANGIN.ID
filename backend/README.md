# TENANGIN.ID Backend

Server API, autentikasi sesi PostgreSQL, otorisasi berbasis peran (`student`, `bk`, `superadmin`), enkripsi data terbatas, dan worker terjadwal `pg-boss`.

## Perintah Penting

- `npm run dev` — Menjalankan HTTP API dalam mode watch.
- `npm run worker` — Menjalankan worker `pg-boss` terpisah.
- `npm run db:migrate` — Menjalankan migrasi skema PostgreSQL.
- `npm run db:seed:demo` — Mengisi dataset demo tiruan (ditolak otomatis jika `APP_MODE !== 'demo'`).
- `npm run bootstrap:admin` — Provision akun Superadmin pertama oleh operator berwenang.
- `npm run backup:verify` — Menguji ekspor backup terenkripsi dan restore + tombstone penghapusan.
- `npm test` — Menjalankan unit dan integrasi test Vitest + Supertest.
- `npm run lint` — Menjalankan ESLint backend.
