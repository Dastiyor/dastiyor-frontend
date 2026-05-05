import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Phone, MapPin, Star, Calendar, Edit, Briefcase } from 'lucide-react';

export default async function ProfilePage() {
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

    // Get stats
    const [reviews, completedTasks, activeTasks] = await Promise.all([
        prisma.review.findMany({
            where: { reviewedId: user.id },
            select: { rating: true }
        }),
        prisma.task.count({
            where: { assignedUserId: user.id, status: 'COMPLETED' }
        }),
        prisma.task.count({
            where: { assignedUserId: user.id, status: 'IN_PROGRESS' }
        })
    ]);

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : '0.0';

    const accentColor = 'var(--primary)';

    return (
        <>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                        My Profile
                    </h1>
                    <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                        Manage your profile information
                    </p>
                </div>
                <Link
                    href="/provider/profile/edit"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        backgroundColor: accentColor,
                        color: 'white',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: '600'
                    }}
                >
                    <Edit size={16} />
                    Edit Profile
                </Link>
            </div>

            {/* Profile Card */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'start' }}>
                    {/* Avatar */}
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        backgroundColor: accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '2.5rem',
                        flexShrink: 0
                    }}>
                        {user.fullName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>
                            {user.fullName}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                            <Star size={16} color="#F59E0B" fill="#F59E0B" />
                            <span style={{ fontWeight: '600', color: '#1E293B' }}>{averageRating}</span>
                            <span style={{ color: '#64748B', fontSize: '0.85rem' }}>({reviews.length} reviews)</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem' }}>
                                <Mail size={16} color="#64748B" />
                                {user.email}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem' }}>
                                <Phone size={16} color="#64748B" />
                                {user.phone}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem' }}>
                                <Calendar size={16} color="#64748B" />
                                Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="prov-profile-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>{completedTasks}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Completed</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: accentColor, marginBottom: '4px' }}>{activeTasks}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Active</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#F59E0B', marginBottom: '4px' }}>{averageRating}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Rating</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>{reviews.length}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Reviews</div>
                </div>
            </div>

            {/* Bio */}
            {user.bio && (
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1E293B', marginBottom: '12px' }}>About Me</h3>
                    <p style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.9rem' }}>{user.bio}</p>
                </div>
            )}

            {/* Skills */}
            {user.skills && Array.isArray(user.skills) && user.skills.length > 0 && (
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1E293B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Briefcase size={18} />
                        Skills
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {user.skills.map((skill: string, index: number) => (
                            <span
                                key={index}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#F1F5F9',
                                    color: '#475569',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: '500'
                                }}
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            <style>{`
                @media (max-width: 640px) {
                    .prov-profile-stats { grid-template-columns: repeat(2, 1fr) !important; }
                }
            `}</style>
        </>
    );
}
