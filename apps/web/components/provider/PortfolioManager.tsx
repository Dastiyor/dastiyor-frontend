'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Image as ImageIcon, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { PortfolioProject } from '@dastiyor/types';
import { useTranslation } from '@/lib/i18n';

const MAX_PHOTOS = 8;

type Draft = { id: string | null; title: string; description: string; images: string[] };

const card: React.CSSProperties = { backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px' };
const input: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '1rem' };
const iconBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', color: '#475569' };

/** Provider's own portfolio: add, edit, delete and reorder projects. */
export default function PortfolioManager() {
    const { t, tError } = useTranslation();
    const [projects, setProjects] = useState<PortfolioProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/profile/portfolio')
            .then(res => res.json())
            .then(data => setProjects(data.projects ?? []))
            .catch(() => setError(t('portfolio.loadFailed')))
            .finally(() => setLoading(false));
    }, [t]);

    const uploadPhotos = async (files: FileList | null) => {
        if (!files || !draft) return;
        setBusy(true);
        setError('');
        const urls: string[] = [];
        for (const file of Array.from(files).slice(0, MAX_PHOTOS - draft.images.length)) {
            const body = new FormData();
            body.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body });
            const data = await res.json();
            if (res.ok) urls.push(data.url);
            else setError(tError(data.error) || t('profileEdit.uploadFailed'));
        }
        setDraft(d => d && { ...d, images: [...d.images, ...urls] });
        setBusy(false);
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft) return;
        setBusy(true);
        setError('');
        const res = await fetch(draft.id ? `/api/profile/portfolio/${draft.id}` : '/api/profile/portfolio', {
            method: draft.id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: draft.title, description: draft.description, images: draft.images }),
        });
        const data = await res.json();
        setBusy(false);
        if (!res.ok) {
            setError(tError(data.error) || t('profileEdit.updateFailed'));
            return;
        }
        setProjects(list => draft.id ? list.map(p => p.id === draft.id ? data.project : p) : [...list, data.project]);
        setDraft(null);
    };

    const remove = async (id: string) => {
        setConfirmId(null);
        const res = await fetch(`/api/profile/portfolio/${id}`, { method: 'DELETE' });
        if (res.ok) setProjects(list => list.filter(p => p.id !== id));
        else setError(t('profileEdit.updateFailed'));
    };

    const move = (index: number, delta: -1 | 1) => {
        const next = [...projects];
        [next[index], next[index + delta]] = [next[index + delta], next[index]];
        setProjects(next);
        fetch('/api/profile/portfolio', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: next.map(p => p.id) }),
        }).catch(() => setError(t('profileEdit.updateFailed')));
    };

    if (loading) return <p>{t('common.loading')}</p>;

    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            {error && <div role="alert" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px' }}>{error}</div>}

            {draft ? (
                <form onSubmit={save} style={{ ...card, display: 'grid', gap: '14px' }}>
                    <label htmlFor="pf-title" style={{ fontWeight: 600 }}>{t('portfolio.projectTitle')}</label>
                    <input id="pf-title" style={input} value={draft.title} maxLength={100} required
                        onChange={e => setDraft({ ...draft, title: e.target.value })} />
                    <label htmlFor="pf-desc" style={{ fontWeight: 600 }}>{t('portfolio.projectDescription')}</label>
                    <textarea id="pf-desc" style={{ ...input, resize: 'vertical' }} rows={3} maxLength={1000} value={draft.description}
                        onChange={e => setDraft({ ...draft, description: e.target.value })} />

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {draft.images.map((src, i) => (
                            <div key={src + i} style={{ position: 'relative', width: 88, height: 88 }}>
                                <img src={src} alt={`${t('portfolio.photo')} ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                                <button type="button" aria-label={t('portfolio.removePhoto')}
                                    onClick={() => setDraft({ ...draft, images: draft.images.filter((_, j) => j !== i) })}
                                    style={{ ...iconBtn, position: 'absolute', top: 4, right: 4, width: 24, height: 24 }}><X size={14} /></button>
                            </div>
                        ))}
                        {draft.images.length < MAX_PHOTOS && (
                            <label htmlFor="pf-photos" style={{ ...iconBtn, width: 88, height: 88, flexDirection: 'column', gap: 4, fontSize: '0.75rem' }}>
                                <ImageIcon size={20} />{t('portfolio.addPhotos')}
                                <input id="pf-photos" type="file" accept="image/*" multiple disabled={busy} style={{ display: 'none' }}
                                    onChange={e => uploadPhotos(e.target.files)} />
                            </label>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDraft(null)}>{t('common.cancel')}</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>{t('portfolio.saveProject')}</button>
                    </div>
                </form>
            ) : (
                <button type="button" className="btn btn-primary" style={{ justifySelf: 'start', display: 'inline-flex', gap: 8, alignItems: 'center' }}
                    disabled={projects.length >= 20}
                    onClick={() => setDraft({ id: null, title: '', description: '', images: [] })}>
                    <Plus size={18} />{t('portfolio.addProject')}
                </button>
            )}

            {projects.length === 0 && !draft && <p style={{ color: '#64748B' }}>{t('portfolio.empty')}</p>}

            {projects.map((p, i) => (
                <div key={p.id} style={{ ...card, display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                        <div style={{ minWidth: 0 }}>
                            <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{p.title}</h3>
                            {p.description && <p style={{ color: '#64748B', marginTop: 4 }}>{p.description}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button type="button" style={iconBtn} aria-label={t('portfolio.moveUp')} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
                            <button type="button" style={iconBtn} aria-label={t('portfolio.moveDown')} disabled={i === projects.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
                            <button type="button" style={iconBtn} aria-label={t('portfolio.edit')}
                                onClick={() => setDraft({ id: p.id, title: p.title, description: p.description ?? '', images: p.images })}><Pencil size={16} /></button>
                            <button type="button" style={{ ...iconBtn, color: '#b91c1c' }} aria-label={t('portfolio.delete')} onClick={() => setConfirmId(p.id)}><Trash2 size={16} /></button>
                        </div>
                    </div>
                    {confirmId === p.id && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span>{t('portfolio.deleteQuestion')}</span>
                            <button type="button" className="btn btn-outline" onClick={() => setConfirmId(null)}>{t('common.cancel')}</button>
                            <button type="button" className="btn" style={{ background: '#b91c1c', color: 'white' }} onClick={() => remove(p.id)}>{t('portfolio.confirmDelete')}</button>
                        </div>
                    )}
                    {p.images.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '8px' }}>
                            {p.images.map((src, j) => (
                                <img key={src + j} src={src} alt={`${p.title} ${j + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
