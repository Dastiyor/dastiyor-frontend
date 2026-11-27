'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Lightbulb } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useTranslation } from '@/lib/i18n';
import { CATEGORIES, CITIES } from '@/lib/config-fallback';
import { looksLikeServiceAd } from '@/lib/service-ad';
import { taskFieldErrors, TASK_DESCRIPTION_MAX, TASK_TITLE_MAX, type TaskField } from '@/lib/task-rules';

// Cities are canonical Russian strings; the API rejects anything else.
const DEFAULT_CITY = CITIES[0];

const fieldLabel: React.CSSProperties = { display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' };
const fieldError: React.CSSProperties = { color: '#DC2626', fontSize: '0.8rem', marginTop: '6px' };
const counter: React.CSSProperties = { textAlign: 'right', fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px' };
const border = (bad: boolean) => `1px solid ${bad ? '#DC2626' : '#D1D5DB'}`;

export default function CreateTaskPage() {
    const { t, tr, tError } = useTranslation();
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const DRAFT_KEY = 'task_draft';

    const [formData, setFormData] = useState({
        category: '',
        title: '',
        description: '',
        city: DEFAULT_CITY,
        address: '',
        // Negotiable first: someone who doesn't know the price isn't asked for one.
        // "Фикс. цена" then requires an amount (lib/task-rules.ts).
        budget: 'negotiable',
        amount: '',
        urgency: 'normal',
        dueDate: '',
        images: [] as string[],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Shown once when the text reads like a provider's ad; "post anyway" goes on.
    const [adWarning, setAdWarning] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);
    // A field's error shows once the customer has left it, or after a publish
    // attempt, and then follows every keystroke.
    const [touched, setTouched] = useState<Partial<Record<TaskField, boolean>>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const errors = taskFieldErrors(formData);
    const errorFor = (field: TaskField) =>
        (touched[field] || submitAttempted) && errors[field] ? t(`createTask.${errors[field]}`) : null;
    const touch = (field: TaskField) => setTouched(prev => ({ ...prev, [field]: true }));
    // Categories are admin-managed; the static list is the first-paint value
    // until /api/config answers. Cities are static everywhere.
    const [categories, setCategories] = useState<string[]>(CATEGORIES);

    useEffect(() => {
        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data.categories) && data.categories.length) {
                    setCategories(data.categories);
                }
            })
            .catch(() => { /* keep the static list */ });
    }, []);

    // Auth gate on mount — redirect to login before user fills the form
    useEffect(() => {
        fetch('/api/auth/me').then(res => {
            if (res.status === 401) {
                router.replace('/login?redirect=/create-task');
            } else {
                setAuthChecked(true);
            }
        }).catch(() => setAuthChecked(true));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load draft or template on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                // Drafts saved before Nov 2026 hold the Latin 'Dushanbe', which the API rejects.
                if (!CITIES.includes(draft.city)) draft.city = DEFAULT_CITY;
                setFormData(prev => ({ ...prev, ...draft }));
                setHasDraft(true);
            } catch (e) {
                // Invalid draft, ignore
            }
        }

        // A template chosen on /create-task/template arrives in the URL. Applied
        // after the draft, so picking a template is not undone by an old draft.
        const params = new URLSearchParams(window.location.search);
        const template: { title?: string; description?: string; category?: string } = {};
        for (const field of ['title', 'description', 'category'] as const) {
            const value = params.get(field);
            if (value) template[field] = value;
        }
        if (Object.keys(template).length) {
            setFormData(prev => ({ ...prev, ...template }));
            // A category alone comes from the empty task feed, not a template.
            if (template.title || template.description) toast.info(t('createTask.templateLoaded'));
        }
    }, []);

    // Auto-save draft
    useEffect(() => {
        const hasContent = formData.title || formData.description || formData.category;
        if (hasContent && !isSubmitting) {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
            setHasDraft(true);
        }
    }, [formData, isSubmitting]);

    const saveDraft = () => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
        toast.success(t('createTask.draftSaved'));
        setHasDraft(true);
    };

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
        toast.info(t('createTask.draftCleared'));
    };

    // Add upload handlers
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const fd = new FormData();
                fd.append('file', files[i]);
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                if (res.ok) {
                    const json = await res.json();
                    setFormData(prev => ({ ...prev, images: [...prev.images, json.url] }));
                } else {
                    toast.error(t('createTask.uploadError'));
                }
            }
        } catch (err) {
            toast.error(t('createTask.uploadErrorGeneric'));
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (finalData: typeof formData, adConfirmed = false) => {
        const invalid = Object.keys(taskFieldErrors(finalData)) as TaskField[];
        if (invalid.length) {
            setSubmitAttempted(true);
            document.getElementById(`task-${invalid[0]}`)?.focus();
            return;
        }
        if (!adConfirmed && looksLikeServiceAd(finalData.title, finalData.description)) {
            setAdWarning(true);
            return;
        }
        setAdWarning(false);
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData),
            });

            if (res.status === 401) {
                toast.warning(t('createTask.loginRequired'));
                router.push('/login?redirect=/create-task');
                return;
            }

            if (!res.ok) {
                const errorData = await res.json();
                // OAuth registrants must verify a phone before posting
                if (errorData.code === 'PHONE_VERIFICATION_REQUIRED') {
                    toast.warning(tError(errorData.error));
                    router.push('/verify-phone?redirect=/create-task');
                    return;
                }
                throw new Error(tError(errorData.error) || t('createTask.createFailed'));
            }

            const json = await res.json();
            // Clear draft on successful submission
            localStorage.removeItem(DRAFT_KEY);
            setHasDraft(false);
            toast.success(t('createTask.createSuccess'));
            // Redirect to the new task details
            setTimeout(() => router.push(`/tasks/${json.task.id}`), 1000);

        } catch (error) {
            toast.error(t('createTask.createError', { message: error instanceof Error ? error.message : String(error) }));
            setIsSubmitting(false);
        }
    };

    if (!authChecked) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-light)' }}>
                {t('common.loading')}
            </div>
        );
    }

    if (isSubmitting) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px' }}>
                <div className="spinner" style={{ fontSize: '4rem', marginBottom: '24px' }}>⏳</div>
                <h1 className="heading-lg">{t('createTask.publishing')}</h1>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container" style={{ maxWidth: '1200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h1 className="heading-lg" style={{ marginBottom: '8px' }}>{t('tasks.createNewTask')}</h1>
                        <p style={{ color: '#6B7280' }}>{t('createTask.fillDetails')}</p>
                    </div>
                </div>

                <div className="create-task-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
                    {/* Main Form Column */}
                    <div>
                        {/* Progress Bar (Visual) */}
                        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ backgroundColor: '#DBEAFE', color: '#3B82F6', padding: '4px 12px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' }}>{t('createTask.step1of4')}</span>
                                <span style={{ fontWeight: '600', color: '#111827' }}>{t('createTask.taskInfo')}</span>
                            </div>
                            <div style={{ color: '#6B7280', fontSize: '0.9rem' }}>{t('createTask.percentComplete25')}</div>
                        </div>

                        {/* General Information Card */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '24px', color: '#111827' }}>{t('createTask.generalInfo')}</h2>

                            <div style={{ marginBottom: '24px' }}>
                                <label htmlFor="task-title" style={fieldLabel}>{t('createTask.taskTitleLabel')}</label>
                                <input
                                    id="task-title"
                                    type="text"
                                    placeholder={t('createTask.taskTitlePlaceholder')}
                                    value={formData.title}
                                    maxLength={TASK_TITLE_MAX}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    onBlur={() => touch('title')}
                                    aria-invalid={!!errorFor('title')}
                                    aria-describedby="task-title-error"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: border(!!errorFor('title')), outline: 'none' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                    <div id="task-title-error" role="alert" style={fieldError}>{errorFor('title')}</div>
                                    <div style={counter}>{t('createTask.charCount', { count: formData.title.length, max: TASK_TITLE_MAX })}</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label htmlFor="task-category" style={fieldLabel}>{t('createTask.category')}</label>
                                <select
                                    id="task-category"
                                    value={formData.category}
                                    onChange={(e) => { setFormData({ ...formData, category: e.target.value }); touch('category'); }}
                                    onBlur={() => touch('category')}
                                    aria-invalid={!!errorFor('category')}
                                    aria-describedby="task-category-error"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: border(!!errorFor('category')), outline: 'none', backgroundColor: 'white' }}
                                >
                                    <option value="">{t('createTask.selectCategory')}</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{tr(cat)}</option>
                                    ))}
                                </select>
                                <div id="task-category-error" role="alert" style={fieldError}>{errorFor('category')}</div>
                            </div>

                            <div>
                                <label htmlFor="task-description" style={fieldLabel}>
                                    {t('createTask.detailedDescription')}{' '}
                                    <span style={{ fontWeight: 400, color: '#9CA3AF' }}>{t('createTask.optional')}</span>
                                </label>
                                <textarea
                                    id="task-description"
                                    placeholder={t('createTask.detailPlaceholder')}
                                    rows={5}
                                    value={formData.description}
                                    maxLength={TASK_DESCRIPTION_MAX}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    onBlur={() => touch('description')}
                                    aria-invalid={!!errorFor('description')}
                                    aria-describedby="task-description-error"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: border(!!errorFor('description')), outline: 'none', resize: 'vertical' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                    <div id="task-description-error" role="alert" style={fieldError}>{errorFor('description')}</div>
                                    <div style={counter}>{t('createTask.charCount', { count: formData.description.length, max: TASK_DESCRIPTION_MAX })}</div>
                                </div>
                            </div>

                            {/* Image Upload Section */}
                            <div style={{ marginTop: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>{t('createTask.photosLabel')}</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                    {formData.images.map((img, idx) => (
                                        <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                                            <img src={img} alt={t('createTask.photoAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                            <button
                                                onClick={() => removeImage(idx)}
                                                style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                                            >✕</button>
                                        </div>
                                    ))}
                                    <label style={{
                                        width: '80px', height: '80px', borderRadius: '8px', border: '2px dashed #D1D5DB',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                        backgroundColor: uploading ? '#F3F4F6' : 'white'
                                    }}>
                                        <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
                                        <span style={{ fontSize: '24px', color: '#9CA3AF' }}>+</span>
                                    </label>
                                </div>
                                {uploading && <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '4px' }}>{t('createTask.uploadingPhoto')}</div>}
                            </div>
                        </div>

                        {/* Location Details Card */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '24px', color: '#111827' }}>{t('createTask.location')}</h2>
                            <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <div>
                                    <label htmlFor="task-city" style={fieldLabel}>{t('createTask.cityLabel')}</label>
                                    <select
                                        id="task-city"
                                        value={formData.city}
                                        onChange={(e) => { setFormData({ ...formData, city: e.target.value }); touch('city'); }}
                                        aria-invalid={!!errorFor('city')}
                                        aria-describedby="task-city-error"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: border(!!errorFor('city')), outline: 'none', backgroundColor: 'white' }}
                                    >
                                        <option value="">{t('createTask.cityPlaceholder')}</option>
                                        {CITIES.map(c => (
                                            <option key={c} value={c}>{tr(c)}</option>
                                        ))}
                                    </select>
                                    <div id="task-city-error" role="alert" style={fieldError}>{errorFor('city')}</div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>{t('tasks.urgency')}</label>
                                    <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                                        {[
                                            { id: 'normal', label: t('createTask.normalUrgency') },
                                            { id: 'urgent', label: t('createTask.urgentUrgency') },
                                            { id: 'low', label: t('createTask.lowUrgency') }
                                        ].map((u) => (
                                            <button 
                                                key={u.id} 
                                                type="button"
                                                onClick={() => setFormData({ ...formData, urgency: u.id })}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    border: 'none',
                                                    backgroundColor: formData.urgency === u.id ? '#EFF6FF' : 'white',
                                                    color: formData.urgency === u.id ? '#3B82F6' : '#6B7280',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    borderRight: '1px solid #E5E7EB',
                                                    fontWeight: formData.urgency === u.id ? '600' : '400'
                                                }}
                                            >
                                                {u.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>{t('createTask.address')}</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}><MapPin size={20} /></span>
                                    <input
                                        type="text"
                                        placeholder={t('createTask.addressPlaceholder')}
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>{t('createTask.dueDate')}</label>
                                <input
                                    type="datetime-local"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none' }}
                                />
                            </div>

                            {/* Map widget hidden until feature is complete */}
                        </div>

                        {/* Pricing & Schedule */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '24px', color: '#111827' }}>{t('createTask.pricingSchedule')}</h2>
                            <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>{t('createTask.budgetType')}</label>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            onClick={() => setFormData({ ...formData, budget: 'fixed' })}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: '8px',
                                                border: formData.budget === 'fixed' ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                                                backgroundColor: formData.budget === 'fixed' ? '#EFF6FF' : 'white',
                                                color: formData.budget === 'fixed' ? '#3B82F6' : '#6B7280',
                                                fontWeight: '600', cursor: 'pointer'
                                            }}>{t('createTask.fixedPrice')}</button>
                                        <button
                                            onClick={() => setFormData({ ...formData, budget: 'negotiable', amount: '' })}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: '8px',
                                                border: formData.budget === 'negotiable' ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                                                backgroundColor: formData.budget === 'negotiable' ? '#EFF6FF' : 'white',
                                                color: formData.budget === 'negotiable' ? '#3B82F6' : '#6B7280',
                                                fontWeight: '600', cursor: 'pointer'
                                            }}>{t('common.negotiable')}</button>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>{t('filters.budgetTJS')}</label>
                                    <input
                                        id="task-amount"
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        onBlur={() => touch('amount')}
                                        disabled={formData.budget === 'negotiable'}
                                        aria-invalid={!!errorFor('amount')}
                                        aria-describedby="task-amount-error"
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '8px', border: border(!!errorFor('amount')), outline: 'none',
                                            backgroundColor: formData.budget === 'negotiable' ? '#F3F4F6' : 'white',
                                            color: formData.budget === 'negotiable' ? '#9CA3AF' : 'inherit',
                                            cursor: formData.budget === 'negotiable' ? 'not-allowed' : 'auto',
                                        }}
                                    />
                                    <div id="task-amount-error" role="alert" style={fieldError}>{errorFor('amount')}</div>
                                </div>
                            </div>
                        </div>

                        {adWarning && (
                            <div role="alert" style={{
                                marginTop: '32px', padding: '20px', borderRadius: '12px',
                                backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', color: '#7C2D12',
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: '6px' }}>{t('adWarning.title')}</div>
                                <p style={{ margin: '0 0 16px', fontSize: '0.95rem', lineHeight: 1.5 }}>{t('adWarning.body')}</p>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <Link href="/switch-role" className="btn btn-primary">{t('adWarning.becomeProvider')}</Link>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => handleSubmit(formData, true)}
                                    >
                                        {t('adWarning.postAnyway')}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '40px', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                                {hasDraft && t('createTask.draftSavedLabel')}
                            </div>
                            {hasDraft && (
                                <button
                                    onClick={clearDraft}
                                    style={{
                                        padding: '12px 24px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        backgroundColor: 'white',
                                        fontWeight: '600',
                                        color: '#6B7280',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {t('createTask.deleteDraft')}
                                </button>
                            )}
                            <button
                                onClick={saveDraft}
                                style={{
                                    padding: '12px 24px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    backgroundColor: 'white',
                                    fontWeight: '600',
                                    color: '#374151',
                                    cursor: 'pointer'
                                }}
                            >
                                {t('createTask.saveDraft')}
                            </button>
                            <button
                                onClick={() => handleSubmit(formData)}
                                disabled={isSubmitting}
                                style={{
                                    padding: '12px 32px',
                                    borderRadius: '8px',
                                    backgroundColor: '#06B6D4',
                                    color: 'white',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer',
                                    opacity: isSubmitting ? 0.7 : 1
                                }}>
                                {isSubmitting ? t('createTask.publishing') : t('createTask.publish')}
                            </button>
                        </div>
                    </div>

                    {/* Sidebar Column */}
                    <div>
                        {/* Tips Widget */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #E5E7EB' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Lightbulb size={24} color="#F59E0B" fill="#F59E0B" />
                                <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>{t('createTask.tipsTitle')}</h3>
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem', color: '#4B5563', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <li style={{ display: 'flex', gap: '12px' }}>
                                    <span style={{ fontWeight: '700', color: '#0EA5E9', minWidth: '20px' }}>01</span>
                                    <div><span style={{ fontWeight: '600', color: '#111827' }}>{t('createTask.tip1Title')}</span> {t('createTask.tip1Desc')}</div>
                                </li>
                                <li style={{ display: 'flex', gap: '12px' }}>
                                    <span style={{ fontWeight: '700', color: '#0EA5E9', minWidth: '20px' }}>02</span>
                                    <div><span style={{ fontWeight: '600', color: '#111827' }}>{t('createTask.tip2Title')}</span> {t('createTask.tip2Desc')}</div>
                                </li>
                                <li style={{ display: 'flex', gap: '12px' }}>
                                    <span style={{ fontWeight: '700', color: '#0EA5E9', minWidth: '20px' }}>03</span>
                                    <div><span style={{ fontWeight: '600', color: '#111827' }}>{t('createTask.tip3Title')}</span> {t('createTask.tip3Desc')}</div>
                                </li>
                            </ul>
                        </div>

                        {/* Help Widget */}
                        <div style={{ backgroundColor: '#E0F2FE', borderRadius: '16px', padding: '24px', color: '#0369A1' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '8px' }}>{t('createTask.helpTitle')}</h3>
                            <p style={{ fontSize: '0.9rem', marginBottom: '16px', lineHeight: '1.5' }}>{t('createTask.helpDesc')}</p>
                            <button style={{ color: '#0284C7', fontWeight: '600', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: '0.9rem' }}>{t('createTask.contactUs')}</button>
                        </div>
                    </div>
                </div>
            <style>{`
                @media (max-width: 900px) {
                    .create-task-grid { grid-template-columns: 1fr !important; }
                    .create-task-grid > div:last-child { order: -1; }
                }
                @media (max-width: 480px) { .form-row-2 { grid-template-columns: 1fr !important; } }
            `}</style>
            </div>
        </div>
    );
}
