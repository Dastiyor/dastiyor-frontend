import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TaskInfo from '@/components/tasks/TaskInfo';
import TaskSidebar from '@/components/tasks/TaskSidebar';
import ResponseList from '@/components/tasks/ResponseList';
import ReviewForm from '@/components/reviews/ReviewForm';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type Props = {
    params: {
        id: string;
    };
};

export default async function CustomerTaskDetailsPage({ params }: Props) {
    const { id } = await params;
    const task = await prisma.task.findUnique({
        where: { id },
        include: {
            user: {
                select: { id: true, fullName: true, avatar: true, email: true, phone: true, createdAt: true }
            },
            assignedUser: {
                select: { id: true, fullName: true, avatar: true, email: true, phone: true }
            },
            responses: {
                include: {
                    user: {
                        select: { id: true, fullName: true, avatar: true, skills: true }
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
            review: {
                include: {
                    reviewer: {
                        select: { fullName: true }
                    }
                }
            }
        },
    });

    if (!task) {
        notFound();
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    let currentUserId = null;
    if (token) {
        const payload = await verifyJWT(token);
        if (payload) {
            currentUserId = payload.id as string;
        }
    }

    // SECURITY: Filter responses so providers only see their own bids
    if (currentUserId !== task.userId) {
        task.responses = task.responses.filter((r) => r.userId === currentUserId);
    }

    // Verify ownership
    const isOwner = currentUserId === task.userId;
    // (Providers shouldn't access this route, but just in case)

    const isAssignedProvider = currentUserId === task.assignedUserId;
    const canChat = (isOwner && task.assignedUserId) || isAssignedProvider;
    const chatPartnerId = isOwner ? task.assignedUserId : task.userId;
    const canReview = isOwner && task.status === 'COMPLETED' && !task.review && task.assignedUser;

    const accentColor = 'var(--primary)';

    return (
        <div>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.9rem', color: '#64748B' }}>
                <Link href="/customer" style={{ textDecoration: 'none', color: '#64748B' }}>Dashboard</Link>
                <ChevronRight size={14} />
                <Link href="/customer/my-tasks" style={{ textDecoration: 'none', color: '#64748B' }}>My Tasks</Link>
                <ChevronRight size={14} />
                <span style={{ color: accentColor, fontWeight: '500' }}>{task.title}</span>
            </div>

            <div className="task-detail-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 360px',
                gap: '32px',
                alignItems: 'start'
            }}>
                {/* Main Content */}
                <main>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '32px',
                        border: '1px solid #E2E8F0'
                    }}>
                        <TaskInfo task={task} />
                    </div>

                    {/* Assigned Provider Info */}
                    {task.assignedUser && (
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            marginTop: '24px',
                            border: '2px solid #22c55e', // Highlight assigned
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    backgroundColor: accentColor,
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '1.2rem'
                                }}>
                                    {task.assignedUser.fullName[0]}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%' }}></span>
                                        Assigned Professional
                                    </div>
                                    <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#1E293B' }}>
                                        {task.assignedUser.fullName}
                                    </div>
                                </div>
                            </div>

                            {/* Chat Button -> Internal Link */}
                            {canChat && chatPartnerId && (
                                <Link
                                    href={`/customer/messages?userId=${chatPartnerId}&taskId=${task.id}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        backgroundColor: accentColor,
                                        color: 'white',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    💬 Message Provider
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Review Form (for completed tasks) */}
                    {canReview && task.assignedUser && (
                        <div style={{ marginTop: '24px' }}>
                            <div style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '32px',
                                border: '1px solid #E2E8F0'
                            }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px' }}>Leave a Review</h3>
                                <ReviewForm
                                    taskId={task.id}
                                    providerName={task.assignedUser.fullName}
                                />
                            </div>
                        </div>
                    )}

                    {/* Existing Review Display */}
                    {task.review && (
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            marginTop: '24px',
                            border: '1px solid #E2E8F0'
                        }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: '#1E293B' }}>Your Review</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ color: '#fbbf24', fontSize: '1.5rem' }}>
                                    {'★'.repeat(task.review.rating)}
                                    <span style={{ color: '#d1d5db' }}>{'★'.repeat(5 - task.review.rating)}</span>
                                </span>
                                <span style={{ fontWeight: '600', color: '#1E293B' }}>
                                    {task.review.rating}/5
                                </span>
                            </div>
                            {task.review.comment && (
                                <p style={{ color: '#475569', lineHeight: '1.6' }}>
                                    &ldquo;{task.review.comment}&rdquo;
                                </p>
                            )}
                        </div>
                    )}

                    {/* Response List (Offers Management) */}
                    <ResponseList
                        taskId={task.id}
                        responses={task.responses}
                        currentUserId={currentUserId}
                        taskOwnerId={task.userId}
                        assignedUserId={task.assignedUserId}
                        taskStatus={task.status}
                    />
                </main>

                {/* Sidebar */}
                <aside style={{ position: 'sticky', top: '20px' }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid #E2E8F0'
                    }}>
                        <TaskSidebar
                            task={task}
                            isOwner={isOwner}
                            canRespond={false} // Customer can't respond to their own task
                        />
                    </div>
                </aside>
            <style>{`
                @media (max-width: 900px) { .task-detail-grid { grid-template-columns: 1fr !important; gap: 24px !important; } }
            `}</style>
            </div>
        </div>
    );
}
