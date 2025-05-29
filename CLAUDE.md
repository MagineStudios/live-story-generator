# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Live Story Generator - A Next.js 15 AI-powered story generation application that creates personalized children's stories with custom illustrations based on uploaded photos.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed-styles` - Seed visual styles to database

### Database
- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate dev` - Run database migrations
- `npx prisma studio` - Open Prisma Studio GUI

### Deployment
- `vercel` - Deploy to Vercel
- `./check-deployment.sh` - Check deployment status

## Architecture

### Tech Stack
- **Framework**: Next.js 15.3.2 with App Router
- **UI**: React 19, Tailwind CSS 4.1.6, Shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM 6.7.0
- **Authentication**: Clerk
- **AI/ML**: OpenAI GPT-4 for text and gpt-image-1 for illustrations
- **Media Storage**: Cloudinary
- **Background Jobs**: Inngest for async workflows
- **Payments**: Stripe

### Key Patterns
- Server Components by default, Client Components only when necessary
- Server Actions for mutations
- Inngest for all async operations (image generation, video processing)
- Credit-based system for usage tracking
- My World library for reusable story elements

### API Structure
- `/api/images/*` - Image generation, upload, analysis
- `/api/story/*` - Story CRUD, page management, image generation
- `/api/my-world/*` - Character/element management
- `/api/onboarding/*` - Guided onboarding flow
- `/api/inngest` - Background job handler

## Development Preferences

I'm an experienced developer working with Next.js 15+, React 19+, Tailwind CSS, Framer Motion, Inngest, Prisma, and Swift for iOS. When writing code:

- Use the latest stable features: App Router, Server Components, Server Actions, React 19 hooks (use, useOptimistic, useFormStatus)
- Write production-ready code with proper error boundaries, loading states, and suspense boundaries
- Implement polished UX/UI with responsive design and smooth animations
- For animations: Use Tailwind CSS animations/transitions first (animate-*, transition-*), only use Framer Motion for complex gestures, layout animations, or orchestrated sequences
- Handle async operations correctly: proper race condition handling, AbortController for cancellations, optimistic updates
- For AI streaming: implement proper SSE/WebSocket patterns, handle partial responses, show incremental UI updates, use TransformStream for OpenAI/Anthropic APIs
- Background jobs: Use Inngest for all async workflows (image generation, AI processing, batch operations), implement proper event-driven patterns, show job status in UI
- Database: Use Prisma with proper schema design, efficient queries, proper indexing, and connection pooling
- Follow best practices: proper TypeScript types, accessibility (ARIA), performance optimization (lazy loading, code splitting)
- For Swift: use modern Swift 5.9+ syntax, SwiftUI, async/await, proper error handling, and follow Apple's Human Interface Guidelines
- Always consider edge cases: network failures, empty states, long content, mobile responsiveness
- Include proper data validation and sanitization
- Testing: Include examples with Vitest and Testing Library when relevant
- Tailwind approach: Use cn() utility for conditional classes, avoid arbitrary values when possible
- File structure: Feature-based organization, co-locate components with their logic
- Performance: Minimize client components, implement React Compiler optimizations where applicable
- Deployment: Optimize for Vercel/edge runtime, implement proper caching strategies
- Real-time: Prefer Server-Sent Events over WebSockets for unidirectional streaming
- Code style: Prefer explicit types over inference, use const assertions, avoid any
- Avoid: class components, outdated patterns, Create React App approaches, verbose explanations of basic concepts, unnecessary JavaScript libraries when CSS suffices

### Polish & UX Details
- Micro-interactions: Include hover, focus, and active states on all interactive elements
- Loading states: Use skeletons that match content dimensions, stagger animations for lists
- Feedback: Instant visual feedback for all actions (optimistic updates, pending states, success confirmations)
- Mobile: Touch targets min 44px, smooth momentum scrolling, pull-to-refresh where appropriate
- Typography: Consistent scale using Tailwind's prose classes, proper line heights for readability
- Spacing: Use consistent spacing scale, generous whitespace, proper content hierarchy
- Dark mode: Implement with proper color contrast ratios and system preference detection
- Animations: 200-300ms for micro-interactions, spring animations for natural feel, respect prefers-reduced-motion
- Forms: Real-time validation, clear error messages, proper field labels and aria-describedby
- Performance: Optimize for Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- Error handling: User-friendly error messages, recovery suggestions, maintain user data on errors

## Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `CLERK_SECRET_KEY` - Clerk authentication
- `OPENAI_API_KEY` - OpenAI API access
- `CLOUDINARY_URL` - Cloudinary configuration
- `STRIPE_SECRET_KEY` - Stripe payments
- `INNGEST_SIGNING_KEY` - Inngest background jobs

## Current Implementation Notes

- Image generation uses gpt-image-1 model with style presets stored in database
- Story pages are generated with accompanying illustrations
- My World allows saving and reusing characters across stories
- Onboarding flow guides users through character creation
- Credit system tracks usage (10 credits per story)