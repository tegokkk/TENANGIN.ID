import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync('public/sw.js', 'utf8');

function worker(fetchResult, cachedResponse = null) {
  const handlers = new Map();
  const put = vi.fn();
  const match = vi.fn().mockResolvedValue(cachedResponse);
  const fetch = vi.fn(fetchResult);
  vm.runInNewContext(source, {
    self: {
      location: { origin: 'https://tenangin.example' },
      addEventListener: (type, handler) => handlers.set(type, handler),
    },
    caches: { open: vi.fn().mockResolvedValue({ put }), match },
    fetch,
    URL,
    Request,
    Response,
  });
  function navigate(path) {
    const respondWith = vi.fn();
    handlers.get('fetch')({
      request: { method: 'GET', url: `https://tenangin.example${path}`, mode: 'navigate' },
      respondWith,
    });
    return respondWith;
  }
  return { navigate, put, match, fetch };
}

describe('Pembaruan dan fallback navigasi publik PWA', () => {
  it('menggunakan HTML build terbaru walaupun HTML lama tersedia di cache', async () => {
    const sw = worker(async () => new Response('build-baru'), new Response('build-lama'));
    const result = sw.navigate('/');
    expect(await (await result.mock.calls[0][0]).text()).toBe('build-baru');
    expect(sw.put).toHaveBeenCalledOnce();
    expect(sw.match).not.toHaveBeenCalled();
  });

  it('tetap membuka halaman publik dari cache ketika jaringan terputus', async () => {
    const sw = worker(async () => {
      throw new TypeError('Offline');
    }, new Response('bantuan-offline'));
    const result = sw.navigate('/bantuan');
    expect(await (await result.mock.calls[0][0]).text()).toBe('bantuan-offline');
    expect(sw.put).not.toHaveBeenCalled();
  });

  it('melewatkan halaman akun dan API pribadi tanpa mencegat atau menyimpan respons', () => {
    const sw = worker(async () => new Response('data-pribadi'));
    for (const path of [
      '/app',
      '/app/catat',
      '/bk',
      '/superadmin',
      '/api/auth/session',
      '/api/me',
    ]) {
      expect(sw.navigate(path)).not.toHaveBeenCalled();
    }
    expect(sw.fetch).not.toHaveBeenCalled();
    expect(sw.put).not.toHaveBeenCalled();
  });
});
