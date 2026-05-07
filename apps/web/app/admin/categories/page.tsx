'use client';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Wrench, Monitor, SprayCan, Truck, Briefcase, Home, Car, Camera, GraduationCap, Heart, Music, Utensils } from 'lucide-react';

// Default categories with icons
const DEFAULT_CATEGORIES = [
    { id: '1', name: 'Ремонт', icon: 'Wrench', color: '#EF4444', taskCount: 0 },
    { id: '2', name: 'IT и Веб', icon: 'Monitor', color: '#3B82F6', taskCount: 0 },
    { id: '3', name: 'Уборка', icon: 'SprayCan', color: '#10B981', taskCount: 0 },
    { id: '4', name: 'Доставка', icon: 'Truck', color: '#F59E0B', taskCount: 0 },
    { id: '5', name: 'Бизнес услуги', icon: 'Briefcase', color: '#8B5CF6', taskCount: 0 },
    { id: '6', name: 'Дом и сад', icon: 'Home', color: '#06B6D4', taskCount: 0 },
    { id: '7', name: 'Авто', icon: 'Car', color: '#6366F1', taskCount: 0 },
    { id: '8', name: 'Фото и видео', icon: 'Camera', color: '#EC4899', taskCount: 0 },
    { id: '9', name: 'Образование', icon: 'GraduationCap', color: '#14B8A6', taskCount: 0 },
    { id: '10', name: 'Красота и здоровье', icon: 'Heart', color: '#F43F5E', taskCount: 0 },
    { id: '11', name: 'Развлечения', icon: 'Music', color: '#A855F7', taskCount: 0 },
    { id: '12', name: 'Еда и напитки', icon: 'Utensils', color: '#F97316', taskCount: 0 },
];

const ICON_OPTIONS = [
    { name: 'Wrench', component: Wrench },
    { name: 'Monitor', component: Monitor },
    { name: 'SprayCan', component: SprayCan },
    { name: 'Truck', component: Truck },
    { name: 'Briefcase', component: Briefcase },
    { name: 'Home', component: Home },
    { name: 'Car', component: Car },
    { name: 'Camera', component: Camera },
    { name: 'GraduationCap', component: GraduationCap },
    { name: 'Heart', component: Heart },
    { name: 'Music', component: Music },
    { name: 'Utensils', component: Utensils },
];

const getIconComponent = (iconName: string) => {
    const found = ICON_OPTIONS.find(i => i.name === iconName);
    return found ? found.component : Wrench;
};

type Category = {
    id: string;
    name: string;
    icon: string;
    color: string;
    taskCount: number;
};

export default function AdminCategoriesPage() {
    const { confirm, Dialog } = useConfirm();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', icon: '', color: '' });
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', icon: 'Wrench', color: '#6366F1' });

    const fetchCategories = async () => {
        setLoading(true);
        try {
            // Fetch task counts by category from API
            const res = await fetch('/api/tasks?countByCategory=true');
            if (res.ok) {
                const data = await res.json();
                // Merge with default categories
                const categoriesWithCounts = DEFAULT_CATEGORIES.map(cat => ({
                    ...cat,
                    taskCount: data.categoryCounts?.[cat.name] || 0
                }));
                setCategories(categoriesWithCounts);
            } else {
                setCategories(DEFAULT_CATEGORIES);
            }
        } catch {
            setCategories(DEFAULT_CATEGORIES);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleEdit = (cat: Category) => {
        setEditingId(cat.id);
        setEditForm({ name: cat.name, icon: cat.icon, color: cat.color });
    };

    const handleSaveEdit = (id: string) => {
        if (!editForm.name.trim()) {
            toast.warning('Введите название категории');
            return;
        }
        setCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, ...editForm } : cat
        ));
        setEditingId(null);
        toast.success('Категория обновлена');
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm(
            'Вы уверены, что хотите удалить эту категорию?',
            'Удалить категорию',
            'danger'
        );
        if (confirmed) {
            setCategories(prev => prev.filter(cat => cat.id !== id));
            toast.success('Категория удалена');
        }
    };

    const handleAddCategory = () => {
        if (!newCategory.name.trim()) {
            toast.warning('Введите название категории');
            return;
        }

        const newCat: Category = {
            id: Date.now().toString(),
            name: newCategory.name,
            icon: newCategory.icon,
            color: newCategory.color,
            taskCount: 0
        };
        setCategories(prev => [...prev, newCat]);
        setNewCategory({ name: '', icon: 'Wrench', color: '#6366F1' });
        setShowAddForm(false);
        toast.success('Категория добавлена');
    };

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Загрузка категорий...</p>
            </div>
        );
    }

    return (
        <>
            <Dialog />
            <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 className="heading-lg">Управление категориями</h2>
                <button
                    onClick={() => setShowAddForm(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#6366F1',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={18} />
                    Добавить категорию
                </button>
            </div>

            {/* Add Category Form */}
            {showAddForm && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '2px solid #6366F1',
                    marginBottom: '24px'
                }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Новая категория</h3>
                    <div className="cat-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 200px 120px auto auto', gap: '16px', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Название категории"
                            value={newCategory.name}
                            onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                fontSize: '0.95rem'
                            }}
                        />
                        <select
                            value={newCategory.icon}
                            onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })}
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                fontSize: '0.95rem'
                            }}
                        >
                            {ICON_OPTIONS.map(opt => (
                                <option key={opt.name} value={opt.name}>{opt.name}</option>
                            ))}
                        </select>
                        <input
                            type="color"
                            value={newCategory.color}
                            onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                            style={{
                                width: '100%',
                                height: '44px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                cursor: 'pointer'
                            }}
                        />
                        <button
                            onClick={handleAddCategory}
                            style={{
                                backgroundColor: '#10B981',
                                color: 'white',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <Save size={18} />
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            style={{
                                backgroundColor: '#F3F4F6',
                                color: '#6b7280',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Categories Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '480px' }}>
                    <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '16px 24px', fontWeight: '600', width: '60px' }}>Иконка</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Название</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600', width: '80px' }}>Цвет</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600', width: '120px' }}>Заданий</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right', width: '120px' }}>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((cat) => {
                            const IconComponent = getIconComponent(cat.icon);
                            const isEditing = editingId === cat.id;

                            return (
                                <tr key={cat.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            backgroundColor: `${cat.color}20`,
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: cat.color
                                        }}>
                                            <IconComponent size={20} />
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #e5e7eb',
                                                    width: '100%'
                                                }}
                                            />
                                        ) : (
                                            <span style={{ fontWeight: '600' }}>{cat.name}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        {isEditing ? (
                                            <input
                                                type="color"
                                                value={editForm.color}
                                                onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                                                style={{ width: '40px', height: '32px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                backgroundColor: cat.color,
                                                borderRadius: '6px'
                                            }} />
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{
                                            backgroundColor: '#EEF2FF',
                                            color: '#6366F1',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: '600'
                                        }}>
                                            {cat.taskCount}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleSaveEdit(cat.id)}
                                                    style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer' }}
                                                >
                                                    <Save size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleEdit(cat)}
                                                    style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer' }}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Info Box */}
            <div style={{
                marginTop: '24px',
                padding: '20px 24px',
                backgroundColor: '#FEF3C7',
                borderRadius: '12px',
                border: '1px solid #FCD34D'
            }}>
                <p style={{ color: '#92400E', fontSize: '0.9rem' }}>
                    <strong>Примечание:</strong> Изменения в категориях будут применены после сохранения в базе данных.
                    В данный момент категории управляются локально. Для полной интеграции необходимо создать таблицу категорий в базе данных.
                </p>
            <style>{`
                @media (max-width: 640px) { .cat-form-grid { grid-template-columns: 1fr !important; } }
            `}</style>
            </div>
        </div>
        </>
    );
}
