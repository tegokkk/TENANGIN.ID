import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AuthProvider } from '../features/auth/AuthContext.jsx';
import { isPublicCacheablePath } from '../lib/pwa.js';
import { JournalPage } from '../pages/student/JournalPage.jsx';
import { MateriPage } from '../pages/student/MateriPage.jsx';
import { TenangPage } from '../pages/student/TenangPage.jsx';
import { CounselorDashboardPage } from '../pages/counselor/DashboardPage.jsx';
import { ContentPanel } from '../features/superadmin/ContentPanel.jsx';
import { HelpPage } from '../pages/public/HelpPage.jsx';

function mockFetchHandlers(handlers) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init = {}) => {
    const path = String(url).replace(/^\/api/, '');
    const method = (init.method || 'GET').toUpperCase();
    for (const h of handlers) {
      if (h.match(path, method)) {
        const resBody =
          typeof h.response === 'function' ? h.response(path, method, init) : h.response;
        const status = h.status || 200;
        return new Response(JSON.stringify(resBody), {
          status,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
    return new Response(JSON.stringify({ ok: true, data: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
}

function renderWithProviders(ui, route = '/') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider
        router={createMemoryRouter([{ path: '*', element: <AuthProvider>{ui}</AuthProvider> }], {
          initialEntries: [route],
        })}
      />
    </QueryClientProvider>
  );
}

const STUDENT_SESSION = {
  ok: true,
  data: {
    authenticated: true,
    user: { id: 'u1', accountCode: 'Awan-028', role: 'student', gradeGroup: 'Kelas XI' },
    consentStatus: { hasActiveConsent: true, activePolicyVersion: '1.1' },
    school: {
      name: 'SMA Contoh',
      timezone: 'Asia/Jakarta',
      serviceHours: 'Senin-Jumat 08:00-15:30',
      verifiedContacts: [{ label: 'Ruang BK', value: 'Lt. 2' }],
      activeHandlerConfigured: true,
    },
  },
};

describe('Frontend Komponen & Aturan Privasi PRD', () => {
  it('D04 Catat: mempertahankan input saat gagal simpan dan tidak menulis draf ke localStorage', async () => {
    const user = userEvent.setup();
    mockFetchHandlers([
      {
        match: (p) => p === '/public/config',
        response: { ok: true, data: { appMode: 'demo', school: STUDENT_SESSION.data.school } },
      },
      { match: (p) => p === '/auth/session', response: STUDENT_SESSION },
      { match: (p) => p === '/auth/csrf', response: { ok: true, data: { csrfToken: 'csrf-123' } } },
      {
        match: (p, m) => p === '/journals' && m === 'GET',
        status: 200,
        response: { ok: true, data: { entries: [] } },
      },
      {
        match: (p, m) => p === '/journals' && m === 'POST',
        status: 500,
        response: {
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'Gangguan jaringan sementara' },
        },
      },
    ]);

    renderWithProviders(<JournalPage />, '/app/catat');
    await waitFor(() =>
      expect(screen.getByText(/Catatan dapat diakses olehmu dan Superadmin/i)).toBeInTheDocument()
    );

    const sitBox = screen.getByLabelText(/1\. Apa yang terjadi/i);
    const thBox = screen.getByLabelText(/2\. Apa yang kamu pikirkan/i);
    const feelBox = screen.getByLabelText(/3\. Apa yang kamu rasakan/i);

    await user.type(sitBox, 'Tugas menumpuk jelang ujian');
    await user.type(thBox, 'Takut tidak sempat selesai');
    await user.type(feelBox, 'Gelisah');

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    await user.click(screen.getByRole('button', { name: /Simpan Jurnal/i }));

    await waitFor(() =>
      expect(screen.getByText(/Gangguan jaringan sementara/i)).toBeInTheDocument()
    );
    expect(sitBox).toHaveValue('Tugas menumpuk jelang ujian');
    expect(localStorage.length).toBe(0);
  });

  it('D03 Tenang: tidak auto-start dan mendukung tombol Berhenti tanpa label gagal', async () => {
    const user = userEvent.setup();
    mockFetchHandlers([
      { match: (p) => p === '/public/config', response: { ok: true, data: { appMode: 'demo' } } },
      {
        match: (p) => p === '/auth/session',
        response: { ok: true, data: { authenticated: false, user: null } },
      },
      {
        match: (p) => p === '/exercises',
        response: {
          ok: true,
          data: {
            exercises: [
              {
                id: 'ex1',
                slug: 'napas',
                title: 'Latihan Napas Terpandu',
                subtitle: '3 Menit',
                durationSeconds: 180,
                version: 1,
                stopNotice: 'Berhenti kapan pun.',
                sourceReference: 'Contoh',
                mediaRights: 'Internal',
                instructions: [
                  { phase: 'Tarik Napas', seconds: 4, quote: 'Tarik perlahan', detail: 'Rileks' },
                ],
              },
            ],
          },
        },
      },
      {
        match: (p) => p.startsWith('/articles'),
        response: {
          ok: true,
          data: {
            articles: [
              {
                id: 'a1',
                slug: 'stres',
                topic: 'Stres',
                title: 'Memahami Stres Belajar',
                body: 'Isi edukasi singkat.',
                version: 1,
                sourceReference: 'Kurasi',
                mediaRights: 'Internal',
              },
            ],
          },
        },
      },
    ]);

    renderWithProviders(<TenangPage />, '/pustaka');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Mulai Latihan/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /Mulai Latihan/i }));
    expect(screen.getByRole('button', { name: /^Berhenti$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Berhenti$/i }));
    expect(
      screen.getByText(/Latihan dihentikan\. Kamu bisa kembali kapan pun\./i)
    ).toBeInTheDocument();
  });

  it('L02 & L03: menolak cache PWA untuk pustaka yang memerlukan login dan mendukung audio opsional tanpa autoplay dengan padanan teks', async () => {
    expect(isPublicCacheablePath('/api/articles')).toBe(false);
    expect(isPublicCacheablePath('/api/articles/stres')).toBe(false);
    expect(isPublicCacheablePath('/pustaka')).toBe(false);
    expect(isPublicCacheablePath('/api/exercises')).toBe(false);
    expect(isPublicCacheablePath('/api/exercises/napas')).toBe(false);
    expect(isPublicCacheablePath('/audio/napas-terpandu-4-4-4.wav')).toBe(true);
    expect(isPublicCacheablePath('/api/journals')).toBe(false);
    expect(isPublicCacheablePath('/api/moods')).toBe(false);
    expect(isPublicCacheablePath('/api/exports/personal')).toBe(false);
    expect(isPublicCacheablePath('/api/superadmin/users')).toBe(false);
    expect(isPublicCacheablePath('/app/catat')).toBe(false);

    const user = userEvent.setup();
    mockFetchHandlers([
      { match: (p) => p === '/public/config', response: { ok: true, data: { appMode: 'demo' } } },
      {
        match: (p) => p === '/auth/session',
        response: { ok: true, data: { authenticated: false, user: null } },
      },
      {
        match: (p) => p === '/exercises',
        response: {
          ok: true,
          data: {
            exercises: [
              {
                id: 'ex-no-audio',
                slug: 'napas',
                category: 'breathing',
                title: 'Latihan Napas Terpandu',
                subtitle: '3 Menit',
                durationSeconds: 180,
                version: 1,
                audioUrl: null,
                stopNotice: 'Berhenti kapan pun.',
                sourceReference: 'Contoh',
                mediaRights: 'Internal',
                instructions: [
                  { phase: 'Tarik Napas', seconds: 4, quote: 'Tarik perlahan', detail: 'Rileks' },
                ],
              },
            ],
          },
        },
      },
      { match: (p) => p.startsWith('/articles'), response: { ok: true, data: { articles: [] } } },
    ]);

    renderWithProviders(<TenangPage />, '/pustaka');
    await waitFor(() => expect(screen.getByText(/Ilustrasi ritme napas/i)).toBeInTheDocument());
    const toggleBtn = screen.getByRole('button', { name: 'Panduan Teks', exact: true });
    expect(toggleBtn).toBeDisabled();
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(document.querySelector('audio')).toBeNull();
    expect(screen.getByText(/Tarik perlahan/i)).toBeInTheDocument();
  });

  it('D06 Bantuan: menampilkan pratinjau penerima Superadmin tanpa lampiran jurnal otomatis', async () => {
    const user = userEvent.setup();
    mockFetchHandlers([
      {
        match: (p) => p === '/public/config',
        response: { ok: true, data: { appMode: 'demo', school: STUDENT_SESSION.data.school } },
      },
      { match: (p) => p === '/auth/session', response: STUDENT_SESSION },
      { match: (p) => p === '/help-requests', response: { ok: true, data: { requests: [] } } },
    ]);

    renderWithProviders(<HelpPage />, '/app/bantuan');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Tinjau Permintaan/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /Tinjau Permintaan/i }));
    expect(screen.getByText(/Superadmin Sekolah/i)).toBeInTheDocument();
    expect(screen.getByText(/TIDAK dilampirkan secara otomatis/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Kirim Permintaan ke Superadmin/i })
    ).toBeInTheDocument();
  });

  it('D07 Dashboard BK: menampilkan supresi k=5, metadata read-only, dan tanpa tombol mutasi', async () => {
    mockFetchHandlers([
      { match: (p) => p === '/public/config', response: { ok: true, data: { appMode: 'demo' } } },
      {
        match: (p) => p === '/auth/session',
        response: {
          ok: true,
          data: {
            authenticated: true,
            mfaVerified: true,
            user: { id: 'bk1', accountCode: 'BK-Rani-01', displayName: 'Bu Rani', role: 'bk' },
          },
        },
      },
      {
        match: (p) => p === '/bk/dashboard',
        response: {
          ok: true,
          data: {
            counselor: {
              accountCode: 'BK-Rani-01',
              displayName: 'Bu Rani',
              assignedGroups: ['Kelas X', 'Kelas XI'],
            },
            suppressionThreshold: 5,
            weekStart: '2026-11-09',
            weekEnd: '2026-11-15',
            snapshotsByGroup: {
              'Kelas X': [
                {
                  metricKey: 'weekly_active_students',
                  metricLabel: 'Siswa Aktif Mingguan',
                  isSuppressed: true,
                  suppressionReason: 'Data belum cukup untuk ditampilkan',
                  value: null,
                },
              ],
            },
          },
        },
      },
      {
        match: (p) => p.startsWith('/bk/activities'),
        response: {
          ok: true,
          data: {
            activities: [
              {
                id: 'act1',
                studentCode: 'Awan-028',
                gradeGroup: 'Kelas XI',
                activityType: 'exercise',
                activityLabel: 'Latihan Napas Terpandu',
                statusLabel: 'Selesai',
                durationSeconds: 180,
                occurredAt: '2026-11-20T03:00:00Z',
              },
            ],
          },
        },
      },
    ]);

    renderWithProviders(<CounselorDashboardPage />, '/bk');
    await waitFor(() =>
      expect(screen.getByText(/Data belum cukup untuk ditampilkan/i)).toBeInTheDocument()
    );
    await waitFor(() => expect(screen.getByText('Awan-028')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Hapus|Edit|Buat/i })).not.toBeInTheDocument();
  });
  it('Bantuan tanpa konfigurasi sekolah menampilkan keadaan kosong tanpa petugas atau jam fiktif', async () => {
    mockFetchHandlers([
      {
        match: (p) => p === '/public/config',
        response: { ok: true, data: { school: null, schools: [], appMode: 'pilot' } },
      },
      {
        match: (p) => p === '/auth/session',
        response: { ok: true, data: { authenticated: false, user: null } },
      },
    ]);
    renderWithProviders(<HelpPage />, '/bantuan');
    await waitFor(() =>
      expect(screen.getByText(/Kontak sekolah belum tersedia/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/Jam layanan belum ditetapkan/i)).toBeInTheDocument();
    expect(screen.queryByText(/Bu Rani|Pak Surya|08:00|15:00|Senin/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kirim Permintaan/i })).not.toBeInTheDocument();
  });

  it('Materi siswa: menampilkan materi terbit, mendukung filter topik, dan membuka isi lengkap', async () => {
    const user = userEvent.setup();
    mockFetchHandlers([
      {
        match: (p) => p === '/public/config',
        response: { ok: true, data: { appMode: 'demo', school: STUDENT_SESSION.data.school } },
      },
      { match: (p) => p === '/auth/session', response: STUDENT_SESSION },
      {
        match: (p) => p.startsWith('/articles'),
        response: {
          ok: true,
          data: {
            articles: [
              {
                id: 'm1',
                slug: 'mengelola-stres-ujian',
                topic: 'Stres Belajar',
                title: 'Cara Mengelola Stres Jelang Ujian',
                summary: 'Langkah singkat mengatur jadwal belajar tanpa panik.',
                body: 'Mulailah dari satu tugas kecil selama 20 menit lalu ambil jeda 5 menit.',
                tags: ['stres', 'ujian'],
                version: 1,
                sourceReference: 'Tim BK Sekolah',
                mediaRights: 'Materi internal sekolah',
                publishedAt: '2026-11-26T08:00:00Z',
              },
              {
                id: 'm2',
                slug: 'tidur-cukup-remaja',
                topic: 'Tidur',
                title: 'Menjaga Pola Tidur di Hari Sekolah',
                summary: 'Kebiasaan sederhana sebelum tidur.',
                body: 'Jauhkan layar 30 menit sebelum tidur agar pikiran lebih tenang.',
                tags: ['tidur'],
                version: 1,
                sourceReference: 'Tim BK Sekolah',
                mediaRights: 'Materi internal sekolah',
                publishedAt: '2026-11-25T08:00:00Z',
              },
            ],
          },
        },
      },
    ]);

    renderWithProviders(<MateriPage />, '/app/materi');
    await waitFor(() =>
      expect(screen.getByText('Cara Mengelola Stres Jelang Ujian')).toBeInTheDocument()
    );
    expect(screen.getByText('Menjaga Pola Tidur di Hari Sekolah')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tidur', exact: true }));
    expect(screen.queryByText('Cara Mengelola Stres Jelang Ujian')).not.toBeInTheDocument();
    expect(screen.getByText('Menjaga Pola Tidur di Hari Sekolah')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Baca Materi/i }));
    expect(
      screen.getByText(/Jauhkan layar 30 menit sebelum tidur agar pikiran lebih tenang/i)
    ).toBeInTheDocument();
  });

  it('Superadmin ContentPanel: mengirim publishNow saat klik Simpan & Terbitkan ke Siswa', async () => {
    const user = userEvent.setup();
    let capturedBody = null;
    mockFetchHandlers([
      { match: (p) => p === '/public/config', response: { ok: true, data: { appMode: 'demo' } } },
      { match: (p) => p === '/auth/csrf', response: { ok: true, data: { csrfToken: 'csrf-123' } } },
      {
        match: (p, m) => p === '/superadmin/content/articles' && m === 'GET',
        response: { ok: true, data: { articles: [] } },
      },
      {
        match: (p, m) => p === '/superadmin/content/exercises' && m === 'GET',
        response: { ok: true, data: { exercises: [] } },
      },
      {
        match: (p, m) => p === '/superadmin/content/articles' && m === 'POST',
        status: 201,
        response: (_p, _m, init) => {
          capturedBody = JSON.parse(init.body);
          return {
            ok: true,
            data: {
              article: {
                id: 'a-new',
                ...capturedBody,
                version: 1,
                status: capturedBody.publishNow ? 'published' : 'draft',
              },
            },
          };
        },
      },
    ]);

    renderWithProviders(<ContentPanel />, '/superadmin');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Buat Artikel Baru' })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: 'Buat Artikel Baru' }));
    await user.type(screen.getByLabelText('Judul Artikel'), 'Tips Fokus Belajar');
    await user.type(screen.getByLabelText('Topik'), 'Belajar');
    await user.type(screen.getByLabelText('Ringkasan'), 'Panduan singkat menjaga fokus belajar.');
    await user.type(
      screen.getByLabelText('Isi Artikel'),
      'Bagi waktu belajar menjadi sesi 25 menit dengan jeda singkat.'
    );

    expect(screen.getByLabelText('Slug')).toHaveValue('tips-fokus-belajar');
    await user.click(screen.getByRole('button', { name: 'Simpan & Terbitkan ke Siswa' }));

    await waitFor(() => expect(capturedBody).not.toBeNull());
    expect(capturedBody.publishNow).toBe(true);
    expect(capturedBody.slug).toBe('tips-fokus-belajar');
  });
});
