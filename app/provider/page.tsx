import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
    Star,
    CheckCircle,
    DollarSign,
    Clock,
    MapPin,
    Zap,
    Rocket
} from 'lucide-react';

export default async function ProviderDashboard() {
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
        where: { id: payload.id as string },
        include: {
            subscription: true
        }
    });

    if (!user || user.role !== 'PROVIDER') {
        redirect('/access-denied');
    }

    // Get provider statistics
    // Calculate date for 30 days ago for trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [reviews, completedTasks, activeTasks, responses, newOpportunities, completedRecent] = await Promise.all([
        prisma.review.findMany({
            where: { reviewedId: user.id },
            select: { rating: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.task.count({
            where: { assignedUserId: user.id, status: 'COMPLETED' }
        }),
        prisma.task.findMany({
            where: { assignedUserId: user.id, status: 'IN_PROGRESS' },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: {
                user: {
                    select: { fullName: true, avatar: true }
                }
            }
        }),
        prisma.response.findMany({
            where: { userId: user.id },
            select: { status: true }
        }),
        prisma.task.findMany({
            where: {
                status: 'OPEN',
                NOT: { userId: user.id }
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: {
                user: { select: { fullName: true } },
                _count: { select: { responses: true } }
            }
        }),
        prisma.task.count({
            where: {
                assignedUserId: user.id,
                status: 'COMPLETED',
                updatedAt: { gte: thirtyDaysAgo }
            }
        })
    ]);

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : '0.0';

    // Calculate rating change dynamically based on the latest review
    // (Current Avg) - (Avg before latest review)
    let ratingChange = null;
    if (reviews.length >= 2) {
        const currentAvg = totalRating / reviews.length;
        const previousTotal = totalRating - reviews[0].rating;
        const previousAvg = previousTotal / (reviews.length - 1);
        const diff = currentAvg - previousAvg;
        if (Math.abs(diff) >= 0.1) {
            ratingChange = (diff > 0 ? '+' : '') + diff.toFixed(1);
        }
    }

    const responseStats = {
        pending: responses.filter(r => r.status === 'PENDING').length,
        accepted: responses.filter(r => r.status === 'ACCEPTED').length,
        rejected: responses.filter(r => r.status === 'REJECTED').length
    };

    const accentColor = 'var(--primary)';
    const accentColorLight = '#DBEAFE';

    return (
        <>
            {/* Welcome Section */}
            <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                    Welcome back, {user.fullName.split(' ')[0]}
                </h2>
                <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                    Here&apos;s a snapshot of your business performance today.
                </p>
            </div>

            {/* Performance Metrics */}
            <div className="prov-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
                {/* Average Rating */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            backgroundColor: '#FEF3C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Star size={22} color="#F59E0B" fill="#F59E0B" />
                        </div>
                        {ratingChange && (
                            <span style={{ fontSize: '0.75rem', color: accentColor, fontWeight: '600' }}>
                                📈 {ratingChange}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '4px' }}>
                        Average Rating
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B' }}>
                        {averageRating}<span style={{ fontSize: '1rem', color: '#94A3B8' }}>/5</span>
                    </div>
                </div>

                {/* Completed Tasks */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            backgroundColor: accentColorLight,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <CheckCircle size={22} color={accentColor} />
                        </div>
                        {completedRecent > 0 && (
                            <span style={{ fontSize: '0.75rem', color: accentColor, fontWeight: '600' }} title="Last 30 days">
                                📈 +{completedRecent}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '4px' }}>
                        Completed Tasks
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B' }}>
                        {completedTasks}
                    </div>
                </div>

                {/* Total Earned */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            backgroundColor: '#DCFCE7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <DollarSign size={22} color="#22C55E" />
                        </div>
                        {/* 
                         TODO: Implement transaction history to calculate earnings growth.
                         For now, show absolute value only to avoid fake data.
                        */}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '4px' }}>
                        Total Earned
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B' }}>
                        ${user.balance.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="prov-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Active Tasks */}
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1E293B' }}>
                                Active Tasks
                            </h3>
                            <Link href="/provider/active-tasks" style={{
                                fontSize: '0.8rem',
                                color: accentColor,
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}>
                                View All
                            </Link>
                        </div>

                        {activeTasks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                                <Clock size={40} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                                <p style={{ fontSize: '0.9rem' }}>No active tasks</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                        <th style={{ textAlign: 'left', padding: '10px 0', fontSize: '0.75rem', color: '#64748B', fontWeight: '600' }}>PROJECT NAME</th>
                                        <th style={{ textAlign: 'left', padding: '10px 0', fontSize: '0.75rem', color: '#64748B', fontWeight: '600' }}>CUSTOMER</th>
                                        <th style={{ textAlign: 'left', padding: '10px 0', fontSize: '0.75rem', color: '#64748B', fontWeight: '600' }}>DEADLINE</th>
                                        <th style={{ textAlign: 'left', padding: '10px 0', fontSize: '0.75rem', color: '#64748B', fontWeight: '600' }}>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeTasks.map((task) => (
                                        <tr key={task.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '14px 0' }}>
                                                <Link href={`/provider/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
                                                    <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1E293B' }}>{task.title}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{task.category}</div>
                                                </Link>
                                            </td>
                                            <td style={{ padding: '14px 0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#E2E8F0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '600',
                                                        color: '#475569'
                                                    }}>
                                                        {task.user.fullName.charAt(0)}
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>{task.user.fullName}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 0', fontSize: '0.85rem', color: '#475569' }}>
                                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                                            </td>
                                            <td style={{ padding: '14px 0' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    backgroundColor: accentColorLight,
                                                    color: accentColor,
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600'
                                                }}>
                                                    In Progress
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* My Responses */}
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0'
                    }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1E293B', marginBottom: '16px' }}>
                            My Responses
                        </h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{
                                flex: 1,
                                padding: '16px',
                                backgroundColor: '#F8FAFC',
                                borderRadius: '12px',
                                textAlign: 'center',
                                border: '1px solid #E2E8F0'
                            }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '6px', fontWeight: '600' }}>
                                    PENDING
                                </div>
                                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B' }}>
                                    {String(responseStats.pending).padStart(2, '0')}
                                </div>
                            </div>
                            <div style={{
                                flex: 1,
                                padding: '16px',
                                backgroundColor: '#F8FAFC',
                                borderRadius: '12px',
                                textAlign: 'center',
                                border: '1px solid #E2E8F0'
                            }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '6px', fontWeight: '600' }}>
                                    ACCEPTED
                                </div>
                                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: accentColor }}>
                                    {String(responseStats.accepted).padStart(2, '0')}
                                </div>
                            </div>
                            <div style={{
                                flex: 1,
                                padding: '16px',
                                backgroundColor: '#F8FAFC',
                                borderRadius: '12px',
                                textAlign: 'center',
                                border: '1px solid #E2E8F0'
                            }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '6px', fontWeight: '600' }}>
                                    REJECTED
                                </div>
                                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B' }}>
                                    {String(responseStats.rejected).padStart(2, '0')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* New Opportunities */}
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Zap size={18} color={accentColor} />
                                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1E293B' }}>
                                    New Opportunities
                                </h3>
                            </div>
                            <div style={{
                                backgroundColor: accentColor,
                                color: 'white',
                                padding: '3px 8px',
                                borderRadius: '10px',
                                fontSize: '0.7rem',
                                fontWeight: '700'
                            }}>
                                {newOpportunities.length}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {newOpportunities.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748B', fontSize: '0.85rem' }}>
                                    No new opportunities
                                </div>
                            ) : (
                                newOpportunities.map((task) => (
                                    <div key={task.id} style={{
                                        padding: '14px',
                                        backgroundColor: '#F8FAFC',
                                        borderRadius: '12px',
                                        border: '1px solid #E2E8F0'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                            <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1E293B' }}>
                                                {task.title}
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                                                {/* eslint-disable-next-line react-hooks/purity */}
                                                {Math.floor((Date.now() - new Date(task.createdAt).getTime()) / 60000)}m ago
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={12} />
                                            {task.city}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: accentColor }}>
                                                {task.budgetType === 'fixed' ? `$${task.budgetAmount} - $${Number(task.budgetAmount || 0) + 50}` : 'Negotiable'}
                                            </div>
                                            <Link href={`/provider/tasks/${task.id}`} style={{
                                                padding: '6px 12px',
                                                backgroundColor: 'white',
                                                color: '#475569',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                border: '1px solid #E2E8F0'
                                            }}>
                                                View Details
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <Link href="/provider/task-feed" style={{
                            display: 'block',
                            textAlign: 'center',
                            marginTop: '12px',
                            fontSize: '0.8rem',
                            color: accentColor,
                            textDecoration: 'none',
                            fontWeight: '600'
                        }}>
                            See all matches in your categories
                        </Link>
                    </div>

                    {/* TODO: Re-enable "Boost Your Reach" upsell when payment gateway is ready */}
                </div>
            </div>
            <style>{`
                @media (max-width: 640px) {
                    .prov-stats-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                }
                @media (max-width: 900px) and (min-width: 641px) {
                    .prov-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
                @media (max-width: 900px) {
                    .prov-main-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </>
    );
}
