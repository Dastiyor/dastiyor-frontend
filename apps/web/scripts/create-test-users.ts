import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUsers() {
    try {
        // Hash password for all users
        const hashedPassword = await bcrypt.hash('password123', 10);

        // Create Customer
        const customer = await prisma.user.upsert({
            where: { email: 'customer@test.com' },
            update: {},
            create: {
                email: 'customer@test.com',
                password: hashedPassword,
                fullName: 'Test Customer',
                phone: '+992901234567',
                role: 'CUSTOMER',
            },
        });

        // Create Provider
        const provider = await prisma.user.upsert({
            where: { email: 'provider@test.com' },
            update: {},
            create: {
                email: 'provider@test.com',
                password: hashedPassword,
                fullName: 'Test Provider',
                phone: '+992901234568',
                role: 'PROVIDER',
                bio: 'Experienced service provider with 5+ years of experience',
                skills: 'Plumbing, Electrical, Carpentry',
                isVerified: true,
            },
        });

        // Create Admin
        const admin = await prisma.user.upsert({
            where: { email: 'admin@test.com' },
            update: {},
            create: {
                email: 'admin@test.com',
                password: hashedPassword,
                fullName: 'Test Admin',
                phone: '+992901234569',
                role: 'ADMIN',
            },
        });

        // Create subscription for provider (Premium plan)
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30); // 30 days from now

        await prisma.subscription.upsert({
            where: { userId: provider.id },
            update: {
                plan: 'premium',
                startDate: new Date(),
                endDate: subscriptionEndDate,
                isActive: true,
            },
            create: {
                userId: provider.id,
                plan: 'premium',
                startDate: new Date(),
                endDate: subscriptionEndDate,
                isActive: true,
            },
        });

        console.log('\n✅ Test users created successfully!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 LOGIN CREDENTIALS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('👤 CUSTOMER:');
        console.log('   Email: customer@test.com');
        console.log('   Password: password123');
        console.log('   Role: CUSTOMER\n');

        console.log('🔧 PROVIDER:');
        console.log('   Email: provider@test.com');
        console.log('   Password: password123');
        console.log('   Role: PROVIDER');
        console.log('   Subscription: Premium (Active)\n');

        console.log('👑 ADMIN:');
        console.log('   Email: admin@test.com');
        console.log('   Password: password123');
        console.log('   Role: ADMIN\n');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (error) {
        console.error('Error creating test users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestUsers();
