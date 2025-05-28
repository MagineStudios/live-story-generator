import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const styles = await prisma.visualStyle.findMany({
            select: {
                id: true,
                name: true,
                promptTemplate: true
            }
        });

        return NextResponse.json({
            count: styles.length,
            styles: styles.map(style => ({
                id: style.id,
                name: style.name,
                hasPromptTemplate: !!style.promptTemplate,
                promptTemplateLength: style.promptTemplate?.length || 0
            }))
        });
    } catch (error) {
        console.error('Error fetching visual styles:', error);
        return NextResponse.json({ error: 'Failed to fetch visual styles' }, { status: 500 });
    }
}