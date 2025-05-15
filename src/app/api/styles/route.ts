import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {auth, getAuth} from '@clerk/nextjs/server';

// GET handler to fetch all visual styles (public information only)
export async function GET() {
    try {
        const styles = await prisma.visualStyle.findMany({
            select: {
                id: true,
                name: true,
                imageUrl: true,
                color: true,
                textColor: true,
                description: true,
                isDefault: true,
                // Note: promptTemplate is NOT included here for security
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ styles }, { status: 200 });
    } catch (error) {
        console.error('Error fetching visual styles:', error);
        return NextResponse.json(
            { error: 'Failed to fetch visual styles' },
            { status: 500 }
        );
    }
}

// Admin-only POST handler to create or update a visual style (including prompt template)
export async function POST(request: Request) {
    try {
        // Only allow admins to create/update styles
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Check if user is admin (you'll need to implement this logic)
        const isAdmin = await checkIfAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const data = await request.json();

        // Check for required fields
        if (!data.name || !data.id) {
            return NextResponse.json(
                { error: 'Name and ID are required' },
                { status: 400 }
            );
        }

        // Create or update visual style (including prompt template)
        const style = await prisma.visualStyle.upsert({
            where: { id: data.id },
            update: {
                name: data.name,
                imageUrl: data.imageUrl || '',
                color: data.color,
                textColor: data.textColor,
                description: data.description,
                promptTemplate: data.promptTemplate,
                isDefault: data.isDefault !== undefined ? data.isDefault : true
            },
            create: {
                id: data.id,
                name: data.name,
                imageUrl: data.imageUrl || '',
                color: data.color || '#CCCCCC',
                textColor: data.textColor || '#000000',
                description: data.description || '',
                promptTemplate: data.promptTemplate || '',
                isDefault: data.isDefault !== undefined ? data.isDefault : true
            }
        });

        // Return the created style (without the promptTemplate for security)
        return NextResponse.json({
            style: {
                id: style.id,
                name: style.name,
                imageUrl: style.imageUrl,
                color: style.color,
                textColor: style.textColor,
                description: style.description,
                isDefault: style.isDefault
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error saving visual style:', error);
        return NextResponse.json(
            { error: 'Failed to save visual style' },
            { status: 500 }
        );
    }
}

// Helper function to check if user is an admin
async function checkIfAdmin(userId: string): Promise<boolean> {
    // Implement your admin check logic here
    // For example, check against a list of admin user IDs or a role field
    // For now, we'll just return true for simplicity
    return true;
}