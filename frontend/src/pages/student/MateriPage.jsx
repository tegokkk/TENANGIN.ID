import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Search } from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import { formatIndonesianDate } from '../../lib/date-format.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';
import { EmptyState } from '../../components/states/EmptyState.jsx';
import styles from './MateriPage.module.css';

export function MateriPage() {
  const { school } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [activeArticle, setActiveArticle] = useState(null);

  const articlesQuery = useQuery({
    queryKey: ['articles'],
    queryFn: () => apiRequest('/articles?limit=100'),
  });

  const articles = useMemo(() => articlesQuery.data?.articles || [], [articlesQuery.data]);

  const topics = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const item of articles) {
      const topic = String(item.topic || '').trim();
      if (topic && !seen.has(topic.toLowerCase())) {
        seen.add(topic.toLowerCase());
        list.push(topic);
      }
    }
    return list;
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((item) => {
      if (
        selectedTopic !== 'ALL' &&
        String(item.topic || '').trim().toLowerCase() !== selectedTopic.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      const tags = Array.isArray(item.tags) ? item.tags : [];
      return (
        String(item.title || '')
          .toLowerCase()
          .includes(q) ||
        String(item.topic || '')
          .toLowerCase()
          .includes(q) ||
        String(item.summary || '')
          .toLowerCase()
          .includes(q) ||
        tags.some((t) => String(t).toLowerCase().includes(q))
      );
    });
  }, [articles, searchQuery, selectedTopic]);

  const hasFilters = Boolean(searchQuery.trim() || selectedTopic !== 'ALL');

  return (
    <div className="stack-lg">
      <header className="pageHeader">
        <h1 className="pageTitle">Materi</h1>
        <p className="pageLead">
          Bacaan dan panduan singkat dari sekolah untuk membantumu mengelola stres dan belajar
          dengan tenang.
        </p>
      </header>

      <Card className="stack-md">
        <div className={styles.filterRow}>
          <div className={styles.searchWrap}>
            <Input
              label="Cari judul, topik, atau kata kunci"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Contoh: stres, tidur, fokus belajar..."
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedTopic('ALL');
              }}
            >
              Reset Filter
            </Button>
          )}
        </div>

        {topics.length > 0 && (
          <div className={styles.topicBar} role="group" aria-label="Filter topik materi">
            <button
              type="button"
              aria-pressed={selectedTopic === 'ALL'}
              className={`${styles.topicChip} ${selectedTopic === 'ALL' ? styles.topicChipActive : ''}`}
              onClick={() => setSelectedTopic('ALL')}
            >
              Semua ({articles.length})
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                type="button"
                aria-pressed={selectedTopic === topic}
                className={`${styles.topicChip} ${selectedTopic === topic ? styles.topicChipActive : ''}`}
                onClick={() => setSelectedTopic(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        )}
      </Card>

      {articlesQuery.isLoading ? (
        <LoadingState message="Memuat daftar materi..." />
      ) : articlesQuery.isError ? (
        <ErrorState
          message={articlesQuery.error.message}
          onRetry={() => articlesQuery.refetch()}
        />
      ) : articles.length === 0 ? (
        <EmptyState
          title="Belum ada materi terbit"
          description="Sekolah belum menerbitkan materi bacaan. Cek kembali nanti."
        />
      ) : filteredArticles.length === 0 ? (
        <Card className="stack-sm">
          <div className="cluster">
            <Search size={18} color="var(--color-text-secondary)" aria-hidden="true" />
            <strong>Tidak ada materi yang cocok dengan filter saat ini.</strong>
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedTopic('ALL');
              }}
            >
              Tampilkan Semua Materi
            </Button>
          </div>
        </Card>
      ) : (
        <div className={styles.grid}>
          {filteredArticles.map((art) => (
            <Card key={art.id} className={styles.materialCard}>
              <div className="stack-sm" style={{ flex: 1 }}>
                <div className={styles.cardMetaTop}>
                  <Badge tone="lavender">{art.topic}</Badge>
                  {art.publishedAt && (
                    <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                      {formatIndonesianDate(art.publishedAt, school?.timezone)}
                    </span>
                  )}
                </div>
                <h2 className="cardTitle">{art.title}</h2>
                <p className={styles.summary}>{art.summary}</p>
                {Array.isArray(art.tags) && art.tags.length > 0 && (
                  <div className="cluster">
                    {art.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} tone="neutral">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.cardFooter}>
                <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                  {art.sourceReference}
                </span>
                <Button variant="secondary" size="sm" onClick={() => setActiveArticle(art)}>
                  <BookOpen size={15} aria-hidden="true" />
                  <span>Baca Materi</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(activeArticle)}
        onClose={() => setActiveArticle(null)}
        title={activeArticle?.title || 'Detail Materi'}
        size="lg"
      >
        {activeArticle && (
          <article className="stack-md">
            <div className="cluster">
              <Badge tone="lavender">{activeArticle.topic}</Badge>
              <Badge tone="neutral">Versi {activeArticle.version}</Badge>
              {activeArticle.publishedAt && (
                <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                  Terbit {formatIndonesianDate(activeArticle.publishedAt, school?.timezone)}
                </span>
              )}
            </div>

            <p className={styles.readerSummary}>{activeArticle.summary}</p>

            <div className={styles.readerBody}>{activeArticle.body}</div>

            {Array.isArray(activeArticle.tags) && activeArticle.tags.length > 0 && (
              <div className="cluster">
                {activeArticle.tags.map((tag) => (
                  <Badge key={tag} tone="neutral">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className={styles.readerFooter}>
              <span>Sumber: {activeArticle.sourceReference}</span>
              {activeArticle.reviewerRef && <span>• Peninjau: {activeArticle.reviewerRef}</span>}
              <span>• Hak pakai: {activeArticle.mediaRights}</span>
            </div>
          </article>
        )}
      </Dialog>
    </div>
  );
}
