import { Link } from 'react-router';
import { CloudIllustration } from '../assets/illustrations/CloudIllustration.jsx';
import { Card } from '../components/ui/Card.jsx';

export function NotFoundPage() {
  return (
    <Card
      className="stack-md"
      style={{ alignItems: 'center', textAlign: 'center', padding: '48px 24px', maxWidth: 580, marginInline: 'auto' }}
    >
      <CloudIllustration width={150} />
      <h1 className="pageTitle" style={{ fontSize: '1.75rem' }}>
        Halaman Tidak Ditemukan
      </h1>
      <p className="pageLead">
        Alamat yang kamu buka tidak tersedia atau tidak dapat diakses. Kamu bisa kembali ke halaman
        utama atau melihat informasi bantuan sekolah.
      </p>
      <div className="cluster" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btnLinkPrimary">
          Kembali ke Beranda
        </Link>
        <Link to="/bantuan" className="btnLinkLime">
          Butuh bicara?
        </Link>
      </div>
    </Card>
  );
}
