'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Lightbulb } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function CustomerCreateTaskPage() {
    const [uploading, setUploading] = useState(false);
    const DRAFT_KEY = 'task_draft';

    const [formData, setFormData] = useState({
        category: '',
        subcategory: '',
        title: '',
        description: '',
        city: 'Dushanbe',
        address: '',
        budget: 'fixed',
        amount: '',
        urgency: 'normal',
        dueDate: '',
        images: [] as string[],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);

    // Load draft or template on mount
    useEffect(() => {
        // Check for template first
        const template = sessionStorage.getItem('task_template');
        if (template) {
            try {
                const templateData = JSON.parse(template);
                setFormData(prev => ({ ...prev, ...templateData }));
                sessionStorage.removeItem('task_template');
                toast.info('Template loaded');
            } catch (e) {
                // Invalid template, ignore
            }
        }

        // Then check for draft
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                setFormData(prev => ({ ...prev, ...draft }));
                setHasDraft(true);
            } catch (e) {
                // Invalid draft, ignore
            }
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
        toast.success('Draft saved');
        setHasDraft(true);
    };

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
        toast.info('Draft cleared');
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
                    toast.error('Failed to upload image');
                }
            }
        } catch (err) {
            toast.error('Error uploading image');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    };

    const router = useRouter();

    const handleSubmit = async (finalData: any) => {
        setIsSubmitting(true);
        try {
            // Include empty string for missing fields to avoid types mismatch if backend expects string
            const safeData = {
                ...finalData,
                budgetAmount: finalData.budget === 'fixed' ? finalData.amount : null
            };

            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(safeData),
            });

            if (res.status === 401) {
                toast.warning('Please log in to create a task');
                router.push('/login?redirect=/customer/create-task');
                return;
            }

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to create task');
            }

            const json = await res.json();
            // Clear draft on successful submission
            localStorage.removeItem(DRAFT_KEY);
            setHasDraft(false);
            toast.success('Task created successfully!');
            // Redirect to the new task details INSIDE customer dashboard
            setTimeout(() => router.push(`/customer/tasks/${json.task.id}`), 1000);

        } catch (error: any) {
            toast.error(`Error creating task: ${error.message}`);
            setIsSubmitting(false);
        }
    };

    if (isSubmitting) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px' }}>
                <div className="spinner" style={{ fontSize: '4rem', marginBottom: '24px' }}>⏳</div>
                <h1 className="heading-lg">Publishing...</h1>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 className="heading-lg" style={{ marginBottom: '8px', fontSize: '2rem' }}>Create New Task</h1>
                    <p style={{ color: '#6B7280' }}>Fill in the details below to find the best professional.</p>
                </div>
            </div>

            <div className="create-task-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
                {/* Main Form Column */}
                <div>
                    {/* General Information Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', marginBottom: '24px', border: '1px solid #E2E8F0' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '24px', color: '#111827' }}>General Information</h2>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Task Title</label>
                            <input
                                type="text"
                                placeholder="e.g., Fix kitchen faucet"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none', backgroundColor: 'white' }}
                                >
                                    <option value="">Select Category</option>
                                    <option value="Home Repair">Home Repair</option>
                                    <option value="Cleaning">Cleaning</option>
                                    <option value="Delivery">Delivery</option>
                                    <option value="Tech Support">IT & Tech</option>
                                    <option value="Construction">Construction</option>
                                    <option value="Education">Education</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Subcategory</label>
                                <select
                                    value={formData.subcategory}
                                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none', backgroundColor: 'white' }}
                                >
                                    <option value="">Select Subcategory</option>
                                    <option value="Plumbing">Plumbing</option>
                                    <option value="Electrician">Electrician</option>
                                    <option value="Carpentry">Carpentry</option>
                                    <option value="Painting">Painting</option>
                                    <option value="House Cleaning">House Cleaning</option>
                                    <option value="Furniture Assembly">Furniture Assembly</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Detailed Description</label>
                            <textarea
                                placeholder="Describe the problem or task in detail..."
                                rows={5}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none', resize: 'vertical' }}
                            />
                            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px' }}>{formData.description.length} / 2000 characters</div>
                        </div>

                        {/* Image Upload Section */}
                        <div style={{ marginTop: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Photos (Optional)</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {formData.images.map((img, idx) => (
                                    <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                                        <img src={img} alt="Task" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
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
                            {uploading && <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '4px' }}>Uploading photos...</div>}
                        </div>
                    </div>

                    {/* Location Details Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', marginBottom: '24px', border: '1px solid #E2E8F0' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '24px', color: '#111827' }}>Location</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>City / District</label>
                                <input
                                    type="text"
                                    placeholder="Enter your city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Urgency</label>
                                <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                                    {[
                                        { id: 'normal', label: 'Normal' },
                                        { id: 'urgent', label: 'Urgent' },
                                        { id: 'low', label: 'Low' }
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
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Exact Address</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}><MapPin size={20} /></span>
                                <input
                                    type="text"
                                    placeholder="Street, house, apartment..."
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Due Date & Time (Optional)</label>
                            <input
                                type="datetime-local"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Pricing & Schedule */}
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', marginBottom: '24px', border: '1px solid #E2E8F0' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '24px', color: '#111827' }}>Budget</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Budget Type</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setFormData({ ...formData, budget: 'fixed' })}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: '8px',
                                            border: formData.budget === 'fixed' ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                                            backgroundColor: formData.budget === 'fixed' ? '#EFF6FF' : 'white',
                                            color: formData.budget === 'fixed' ? '#3B82F6' : '#6B7280',
                                            fontWeight: '600', cursor: 'pointer'
                                        }}>Fixed</button>
                                    <button
                                        onClick={() => setFormData({ ...formData, budget: 'negotiable' })}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: '8px',
                                            border: formData.budget === 'negotiable' ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                                            backgroundColor: formData.budget === 'negotiable' ? '#EFF6FF' : 'white',
                                            color: formData.budget === 'negotiable' ? '#3B82F6' : '#6B7280',
                                            fontWeight: '600', cursor: 'pointer'
                                        }}>Negotiable</button>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Amount (TJS)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    disabled={formData.budget === 'negotiable'}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '40px', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                            {hasDraft && '💾 Draft saved'}
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
                                Clear Draft
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
                            Save Draft
                        </button>
                        <button
                            onClick={() => handleSubmit(formData)}
                            disabled={isSubmitting}
                            className="btn btn-primary"
                            style={{
                                padding: '12px 32px',
                                borderRadius: '8px',
                                opacity: isSubmitting ? 0.7 : 1
                            }}>
                            {isSubmitting ? 'Publishing...' : 'Publish Task'}
                        </button>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div>
                    {/* Tips Widget */}
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Lightbulb size={24} color="#F59E0B" fill="#F59E0B" />
                            <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Tips for great results</h3>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem', color: '#4B5563', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <li style={{ display: 'flex', gap: '12px' }}>
                                <span style={{ fontWeight: '700', color: '#0EA5E9', minWidth: '20px' }}>01</span>
                                <div><span style={{ fontWeight: '600', color: '#111827' }}>Be specific:</span> Include precise measurements or brands if applicable.</div>
                            </li>
                            <li style={{ display: 'flex', gap: '12px' }}>
                                <span style={{ fontWeight: '700', color: '#0EA5E9', minWidth: '20px' }}>02</span>
                                <div><span style={{ fontWeight: '600', color: '#111827' }}>Photos help:</span> Tasks with photos get 3x more offers.</div>
                            </li>
                            <li style={{ display: 'flex', gap: '12px' }}>
                                <span style={{ fontWeight: '700', color: '#0EA5E9', minWidth: '20px' }}>03</span>
                                <div><span style={{ fontWeight: '600', color: '#111827' }}>Fair pricing:</span> Check similar tasks to attract the best pros.</div>
                            </li>
                        </ul>
                    </div>

                    {/* Help Widget */}
                    <div style={{ backgroundColor: '#E0F2FE', borderRadius: '16px', padding: '24px', color: '#0369A1' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '8px' }}>Need help?</h3>
                        <p style={{ fontSize: '0.9rem', marginBottom: '16px', lineHeight: '1.5' }}>Our support is available 24/7 to help you create the perfect task.</p>
                        <button style={{ color: '#0284C7', fontWeight: '600', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: '0.9rem' }}>Contact Support →</button>
                    </div>
                </div>
            </div>
        <style>{`
            @media (max-width: 900px) { .create-task-grid { grid-template-columns: 1fr !important; } }
        `}</style>
        </div>
    );
}
