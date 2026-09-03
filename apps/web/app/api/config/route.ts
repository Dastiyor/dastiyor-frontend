import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/categories';
import { CITIES } from '@/lib/config-fallback';

export const revalidate = 3600;

export async function GET() {
    return NextResponse.json({ categories: await getCategories(), cities: CITIES });
}
