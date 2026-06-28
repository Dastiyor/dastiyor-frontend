import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock, DollarSign, MapPin, Calendar, MessageSquare } from 'lucide-react';

export default async function MyResponsesPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        redirect('/login');
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
        redirect('/login');
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id as string }
    });

    if (!user || user.role !== 'PROVIDER') {
        redirect('/access-denied');
    }

    const responses = await prisma.response.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
            task: {
                include: {
                    user: {
                        select: { fullName: true, avatar: true }
                    },
                    _count: {
                        select: { responses: true }
                    }
                }
            }
        }
    });

    const stats = {
        total: responses.length,
        pending: responses.filter(r => r.status === 'PENDING').length,
        accepted: responses.filter(r => r.status === 'ACCEPTED').length,
        rejected: responses.filter(r => r.status === 'REJECTED').length,
    };

    const accentColor = 'var(--primary)';

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'ACCEPTED':
                return { text: 'Accepted', color: '#10B981', bg: '#D1FAE5', icon: <CheckCircle size={16} color="#10B981" /> };
            case 'REJECTED':
                return { text: 'Rejected', color: '#EF4444', bg: '#FEE2E2', icon: <XCircle size={16} color="#EF4444" /> };
            default:
                return { text: 'Pending', color: '#F59E0B', bg: '#FEF3C7', icon: <Clock size={16} color="#F59E0B" /> };
        }
    };

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                    My Responses
                </h1>
                <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                    Track and manage all your task responses
                </p>
            </div>

            {/* Stats Cards */}
            <div className="my-responses-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>{stats.total}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Total Responses</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#F59E0B', marginBottom: '4px' }}>{stats.pending}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Pending</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#10B981', marginBottom: '4px' }}>{stats.accepted}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Accepted</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#EF4444', marginBottom: '4px' }}>{stats.rejected}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Rejected</div>
                </div>
            </div>

            {/* Responses List */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                {responses.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1E293B', marginBottom: '8px' }}>No responses yet</h3>
                        <p style={{ color: '#64748B', marginBottom: '20px', fontSize: '0.9rem' }}>
                            Start responding to tasks to see them here
                        </p>
                        <Link href="/provider/task-feed" style={{
                            display: 'inline-block',
                            padding: '10px 20px',
                            backgroundColor: accentColor,
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '0.9rem'
                        }}>
                            Find Tasks
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {responses.map((response) => {
                            const statusInfo = getStatusInfo(response.status);
                            return (
                                <div
                                    key={response.id}
                                    style={{
                                        padding: '20px',
                                        borderBottom: '1px solid #E2E8F0'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                                <Link
                                                    href={`/provider/tasks/${response.taskId}`}
                                                    style={{ fontSize: '1rem', fontWeight: '600', color: '#1E293B', textDecoration: 'none' }}
                                                >
                                                    {response.task.title}
                                                </Link>
                                                <span style={{
                                                    backgroundColor: statusInfo.bg,
                                                    color: statusInfo.color,
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    {statusInfo.icon}
                                                    {statusInfo.text}
                                                </span>
                                            </div>

                                            <p style={{ color: '#475569', marginBottom: '12px', lineHeight: '1.5', fontSize: '0.9rem' }}>
                                                {response.message.length > 150 ? response.message.substring(0, 150) + '...' : response.message}
                                            </p>

                                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748B' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <DollarSign size={14} />
                                                    <span style={{ fontWeight: '600', color: accentColor }}>{response.price} TJS</span>
                                                </div>
                                                {response.estimatedTime && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={14} />
                                                        <span>{response.estimatedTime}</span>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MapPin size={14} />
                                                    <span>{response.task.city}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Calendar size={14} />
                                                    <span>{new Date(response.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MessageSquare size={14} />
                                                    <span>{response.task._count.responses} responses</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <Link
                                                href={`/provider/tasks/${response.taskId}`}
                                                style={{
                                                    padding: '8px 14px',
                                                    backgroundColor: 'white',
                                                    color: '#475569',
                                                    borderRadius: '6px',
                                                    textDecoration: 'none',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                    border: '1px solid #E2E8F0',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                View Task
                                            </Link>
                                            {response.status === 'ACCEPTED' && (
                                                <Link
                                                    href={`/provider/messages?userId=${response.task.userId}&taskId=${response.taskId}`}
                                                    style={{
                                                        padding: '8px 14px',
                                                        backgroundColor: accentColor,
                                                        color: 'white',
                                                        borderRadius: '6px',
                                                        textDecoration: 'none',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600',
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    Message Client
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            <style>{`
            @media (max-width: 900px) { .my-responses-stats { grid-template-columns: repeat(2, 1fr) !important; } }
            @media (max-width: 480px) { .my-responses-stats { grid-template-columns: 1fr !important; } }
        `}</style>
        </div>
        </>
    );
}
