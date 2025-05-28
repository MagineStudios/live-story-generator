# Deployment Instructions

## Vercel Environment Variables

When deploying to Vercel, make sure to add the following environment variables in your Vercel project settings:

### Required Environment Variables

1. **OPENAI_API_KEY** - Your OpenAI API key
2. **OPENAI_ORG_ID** - Your OpenAI organization ID
3. **DATABASE_URL** - Your Neon database pooled connection string
4. **DATABASE_URL_UNPOOLED** - Your Neon database direct connection string (for migrations)
5. **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** - Your Clerk publishable key
6. **CLERK_SECRET_KEY** - Your Clerk secret key
7. **CLOUDINARY_CLOUD_NAME** - Your Cloudinary cloud name
8. **CLOUDINARY_API_KEY** - Your Cloudinary API key
9. **CLOUDINARY_API_SECRET** - Your Cloudinary API secret

### Optional Environment Variables

- **AZURE_OPENAI_API_BASE_URL** - Azure OpenAI endpoint (if using Azure)
- **AZURE_OPENAI_DEPLOYMENT** - Azure OpenAI deployment name
- **AZURE_OPENAI_API_KEY** - Azure OpenAI API key
- **KLING_ACCESS_KEY_ID** - Kling API access key
- **KLING_ACCESS_KEY_SECRET** - Kling API secret
- **INNGEST_EVENT_KEY** - Inngest event key
- **INNGEST_SIGNING_KEY** - Inngest signing key

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with its corresponding value
4. Make sure to add them for the appropriate environments (Production, Preview, Development)

## Database Setup

The project uses Neon PostgreSQL. Make sure to:

1. Use the pooled connection URL for `DATABASE_URL`
2. Use the direct (non-pooled) connection URL for `DATABASE_URL_UNPOOLED`
3. The migrations will automatically run during deployment using the direct connection

## Build Configuration

The project is configured to:
1. Generate Prisma client during install
2. Run database migrations before building
3. Build the Next.js application

This is handled automatically by the scripts in `package.json` and `vercel.json`.
