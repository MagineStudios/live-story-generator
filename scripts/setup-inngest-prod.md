# Inngest Production Setup Guide

## The Issue
Your image generation is not working in production because Inngest needs to be properly configured. Inngest is the background job processing system that handles image generation asynchronously.

## Quick Fix Steps

### 1. Set Up Inngest Account
1. Go to [https://app.inngest.com](https://app.inngest.com)
2. Sign up or log in to your account
3. Create a new app called "magic-story-app" (or use existing)

### 2. Get Your Inngest Keys
In the Inngest dashboard:
1. Go to "Manage" → "Event Keys"
2. Copy your **Event Key**
3. Go to "Manage" → "Signing Keys"
4. Copy your **Signing Key**

### 3. Add Environment Variables to Vercel
Add these to your Vercel project settings:

```
INNGEST_EVENT_KEY=your-event-key-from-inngest
INNGEST_SIGNING_KEY=your-signing-key-from-inngest
```

### 4. Register Your App Endpoint
After deploying with the environment variables:

1. In Inngest dashboard, go to "Apps"
2. Click "Add App URL"
3. Enter your production URL: `https://your-domain.vercel.app/api/inngest`
4. Click "Add"

### 5. Verify the Connection
1. Inngest will automatically sync with your endpoint
2. You should see your `generate-story-images` function appear in the dashboard

### 6. Test It
1. Create a new story in your production app
2. Watch the Inngest dashboard - you should see events being processed
3. Check the "Runs" tab to see your image generation jobs

## Alternative: Disable Inngest (Quick Workaround)

If you want to test without Inngest for now, you can modify the image generation to be synchronous:

1. Edit `/api/story/[storyId]/generate-images/route.ts`
2. Change the production behavior to match development mode
3. This will use placeholder images instead of real generation

## Debugging Tips

### Check if Inngest is Working:
1. Visit `https://your-domain.vercel.app/api/inngest` in your browser
2. You should see: `{"message":"Inngest endpoint configured"}`

### Check Logs:
- Vercel Functions logs: Check for any errors
- Inngest dashboard: Look at the "Runs" tab for failed jobs

### Common Issues:
- **Missing environment variables**: Double-check they're added to Vercel
- **Wrong URL**: Make sure the app URL in Inngest matches your production URL
- **API limits**: Check if you've hit OpenAI API limits

## Production Script (Optional)

If you want to run Inngest locally for testing:

```bash
# Install Inngest CLI
npm install -g inngest-cli

# Run Inngest dev server
npx inngest-cli dev

# In another terminal, run your Next.js app
npm run dev
```

This will let you test the full flow locally before deploying.

## Need Help?

1. Check Inngest logs at https://app.inngest.com
2. Verify all environment variables are set in Vercel
3. Make sure OpenAI API keys are working (test in playground)
4. Check Vercel function logs for errors

The image generation should start working once Inngest is properly connected!
