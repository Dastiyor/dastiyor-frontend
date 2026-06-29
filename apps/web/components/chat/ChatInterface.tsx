'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from '@/components/ui/Toast';
import { useTranslation } from '@/lib/i18n';

type Message = {
    id: string;
    content: string;
    imageUrl?: string;
    senderId: string;
    createdAt: string;
    sender: {
        id: string;
        fullName: string;
    };
};

type Props = {
    currentUserId: string;
};

export default function ChatInterface({ currentUserId }: Props) {
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const partnerId = searchParams.get('userId');
    const taskId = searchParams.get('taskId');

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [partnerName, setPartnerName] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (partnerId) {
            fetchMessages();
            // Poll for new messages every 5 seconds
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [partnerId, taskId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    async function fetchMessages() {
        if (!partnerId) return;

        setLoading(true);
        try {
            let url = `/api/messages?userId=${partnerId}`;
            if (taskId) url += `&taskId=${taskId}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.messages) {
                setMessages(data.messages);
                // Get partner name from first message
                if (data.messages.length > 0) {
                    const firstMsg = data.messages[0];
                    const partner = firstMsg.sender.id === currentUserId
                        ? null
                        : firstMsg.sender;
                    if (partner) {
                        setPartnerName(partner.fullName);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error(t('chat.invalidImageType'));
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('chat.imageTooLarge'));
            return;
        }

        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const removeSelectedImage = () => {
        setSelectedImage(null);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                return data.url;
            }
        } catch (error) {
            console.error('Upload failed:', error);
        }
        return null;
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedImage) || !partnerId) return;

        setSending(true);
        setUploading(!!selectedImage);

        try {
            let imageUrl: string | null = null;

            // Upload image first if selected
            if (selectedImage) {
                imageUrl = await uploadImage(selectedImage);
                if (!imageUrl) {
                    toast.error(t('chat.imageUploadError'));
                    setSending(false);
                    setUploading(false);
                    return;
                }
            }

            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: partnerId,
                    content: newMessage,
                    imageUrl,
                    taskId: taskId || undefined
                })
            });

            if (res.ok) {
                setNewMessage('');
                removeSelectedImage();
                fetchMessages();
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
            setUploading(false);
        }
    };

    if (!partnerId) {
        return (
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: 'var(--text-light)'
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>💬</div>
                <h3 style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    {t('chat.selectChat')}
                </h3>
                <p>{t('chat.selectChatDesc')}</p>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                }}>
                    {partnerName ? partnerName[0].toUpperCase() : '?'}
                </div>
                <div>
                    <div style={{ fontWeight: '600' }}>{partnerName || t('common.loading')}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                        {taskId ? t('chat.taskDiscussion') : t('chat.directMessage')}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {loading && messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
                        {t('chat.loadingMessages')}
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
                        <p>{t('chat.noMessages')}</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>{t('chat.startConversation')}</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = msg.senderId === currentUserId;
                        return (
                            <div
                                key={msg.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: isOwn ? 'flex-end' : 'flex-start'
                                }}
                            >
                                <div style={{
                                    maxWidth: '70%',
                                    padding: msg.imageUrl ? '8px' : '12px 16px',
                                    borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    backgroundColor: isOwn ? 'var(--primary)' : '#f3f4f6',
                                    color: isOwn ? 'white' : 'var(--text)'
                                }}>
                                    {/* Image */}
                                    {msg.imageUrl && (
                                        <div style={{ marginBottom: msg.content ? '8px' : 0 }}>
                                            <img
                                                src={msg.imageUrl}
                                                alt="Shared image"
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '300px',
                                                    borderRadius: '8px',
                                                    display: 'block'
                                                }}
                                            />
                                        </div>
                                    )}
                                    {/* Text */}
                                    {msg.content && (
                                        <div style={{
                                            whiteSpace: 'pre-wrap',
                                            padding: msg.imageUrl ? '4px 8px' : 0
                                        }}>
                                            {msg.content}
                                        </div>
                                    )}
                                    <div style={{
                                        fontSize: '0.75rem',
                                        opacity: 0.7,
                                        marginTop: '4px',
                                        textAlign: 'right',
                                        padding: msg.imageUrl ? '0 8px 4px' : 0
                                    }}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Image Preview */}
            {imagePreview && (
                <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid var(--border)',
                    backgroundColor: '#f9fafb'
                }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                            src={imagePreview}
                            alt="Preview"
                            style={{
                                maxHeight: '100px',
                                borderRadius: '8px'
                            }}
                        />
                        <button
                            type="button"
                            onClick={removeSelectedImage}
                            style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Input */}
            <form
                onSubmit={sendMessage}
                style={{
                    padding: '16px 20px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center'
                }}
            >
                {/* Image upload button */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.5rem',
                        padding: '4px'
                    }}
                    title={t('chat.attachPhoto')}
                >
                    📷
                </button>

                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('chat.typeMessage')}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '24px',
                        border: '1px solid var(--border)',
                        fontSize: '1rem'
                    }}
                />
                <button
                    type="submit"
                    disabled={sending || (!newMessage.trim() && !selectedImage)}
                    className="btn btn-primary"
                    style={{
                        borderRadius: '24px',
                        padding: '12px 24px'
                    }}
                >
                    {uploading ? '📤' : sending ? '...' : t('chat.send')}
                </button>
            </form>
        </div>
    );
}

