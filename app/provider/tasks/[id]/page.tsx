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

export default async function ProviderTaskDetailsPage({ params }: Props) {
    const { id } = await params;
    const task: any = await prisma.task.findUnique({
        where: { id },
        include: {
            user: {
                select: { id: true, fullName: true, avatar: true, email: true, phone: true }
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

    // Check current user for response permission
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
        task.responses = task.responses.filter((r: any) => r.userId === currentUserId);
    }

    const isOwner = currentUserId === task.userId;
    const isAssignedProvider = currentUserId === task.assignedUserId;
    const canChat = (isOwner && task.assignedUserId) || isAssignedProvider;
    const chatPartnerId = isOwner ? task.assignedUserId : task.userId;
    const canReview = isOwner && task.status === 'COMPLETED' && !task.review && task.assignedUser;

    return (
        <div style={{ paddingBottom: '40px' }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '24px', fontSize: '0.9rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link href="/provider" style={{ textDecoration: 'none', color: '#64748B' }}>Dashboard</Link>
                <ChevronRight size={14} />
                <Link href="/provider/task-feed" style={{ textDecoration: 'none', color: '#64748B' }}>Tasks</Link>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--primary)', fontWeight: '500' }}>{task.title}</span>
            </div>

            <div className="task-detail-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 360px',
                gap: '40px',
                alignItems: 'start'
            }}>
                {/* Main Content */}
                <main>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '40px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                        <TaskInfo task={task} />
                    </div>

                    {/* Assigned Provider Info (Only visible if YOU are not the provider, or strictly for owner view? 
                        In provider view, if I am the assigned provider, maybe I want to see Client info?)
                        The original code shows Assigned Provider. 
                        If I am the provider viewing this, I probably want to see the CLIENT info.
                        But TaskInfo might already show client info? 
                        Let's check TaskInfo later.
                        For now, I'll keep the structure.
                    */}
                    {task.assignedUser && (
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            marginTop: '24px',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--primary)',
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
                                    <div style={{ fontSize: '0.85rem', color: '#64748B' }}>
                                        Assigned To
                                    </div>
                                    <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#1E293B' }}>
                                        {task.assignedUser.fullName}
                                    </div>
                                </div>
                            </div>

                            {canChat && chatPartnerId && (
                                <Link
                                    href={`/provider/messages?userId=${chatPartnerId}&taskId=${task.id}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        backgroundColor: 'var(--primary)',
                                        color: 'white',
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    💬 Send Message
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Review Form (for completed tasks) */}
                    {canReview && task.assignedUser && (
                        <div style={{ marginTop: '24px' }}>
                            <ReviewForm
                                taskId={task.id}
                                providerName={task.assignedUser.fullName}
                            />
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
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1E293B', marginBottom: '16px' }}>Review</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ color: '#F59E0B', fontSize: '1.5rem', letterSpacing: '2px' }}>
                                    {'★'.repeat(task.review.rating)}
                                    <span style={{ color: '#E2E8F0' }}>{'★'.repeat(5 - task.review.rating)}</span>
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
                            <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '12px' }}>
                                — {task.review.reviewer.fullName}
                            </p>
                        </div>
                    )}

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
                <aside style={{ position: 'sticky', top: '100px' }}>
                    <TaskSidebar
                        task={task}
                        isOwner={currentUserId === task.userId}
                        canRespond={!!currentUserId && currentUserId !== task.userId}
                    />
                </aside>
            <style>{`
                @media (max-width: 900px) { .task-detail-grid { grid-template-columns: 1fr !important; gap: 24px !important; } }
            `}</style>
            </div>
        </div>
    );
}
