'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { useTranslation } from '@/lib/i18n';

type StepProps = {
    onNext: (data: any) => void;
    onBack: () => void;
    data: any;
};

export default function Step2Details({ onNext, onBack, data }: StepProps) {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState<string[]>(data.images || []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const formData = new FormData();

        // Upload one by one for now (or could be improved to bulk)
        try {
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('file', files[i]);

                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    const json = await res.json();
                    setImages(prev => [...prev, json.url]);
                } else {
                    toast.error(t('chat.imageUploadError'));
                }
            }
        } catch (err) {
            toast.error(t('createTask.uploadErrorGeneric'));
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 className="heading-md" style={{ textAlign: 'center', marginBottom: '8px' }}>{t('createTask.describeTask')}</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-light)', marginBottom: '32px' }}>
                {t('createTask.describeTaskSubtitle')}
            </p>

            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                onNext({
                    title: formData.get('title'),
                    description: formData.get('description'),
                    images: images
                });
            }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>{t('createTask.taskTitleLabel')}</label>
                    <input
                        name="title"
                        defaultValue={data.title}
                        required
                        placeholder={t('createTask.taskTitlePlaceholder')}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>{t('createTask.descriptionLabel')}</label>
                    <textarea
                        name="description"
                        defaultValue={data.description}
                        required
                        placeholder={t('createTask.descriptionPlaceholder')}
                        rows={5}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            outline: 'none',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                        }}
                    />
                </div>

                {/* Image Upload Section */}
                <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>{t('createTask.photosLabel')}</label>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                        gap: '12px',
                        marginBottom: '12px'
                    }}>
                        {images.map((url, idx) => (
                            <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                <img src={url} alt="Task photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        background: 'rgba(0,0,0,0.5)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}

                        <label style={{
                            border: '2px dashed var(--border)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            aspectRatio: '1',
                            backgroundColor: uploading ? '#f3f4f6' : 'transparent'
                        }}>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                disabled={uploading}
                                style={{ display: 'none' }}
                            />
                            <span style={{ fontSize: '1.5rem', color: 'var(--text-light)' }}>+</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{uploading ? '...' : '+'}</span>
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                    <button
                        type="button"
                        onClick={onBack}
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                    >
                        {t('common.back')}
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        disabled={uploading}
                    >
                        {t('common.next')}
                    </button>
                </div>
            </form>
        </div>
    );
}
