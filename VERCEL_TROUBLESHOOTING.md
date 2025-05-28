# Vercel Deployment Troubleshooting Guide

If your commits aren't triggering Vercel deployments, follow these steps:

## 1. Check Git Integration in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your `live-story-generator` project
3. Go to **Settings** → **Git**
4. Verify that:
   - Your GitHub repository is connected: `MagineStudios/live-story-generator`
   - The correct production branch is set (usually `main` or `master`)
   - "Auto-deploy" is enabled

## 2. Verify Your Git Workflow

Run these commands in your terminal:

```bash
# Check current branch
git branch --show-current

# Check remote repository
git remote -v

# Check if you have uncommitted changes
git status

# If you have changes, commit and push them
git add .
git commit -m "Your commit message"
git push origin main  # or your branch name
```

## 3. Common Issues and Solutions

### Issue 1: Wrong Branch
Vercel might be configured to deploy from `main` but you're pushing to `master` (or vice versa).

**Solution:**
```bash
# Check which branch Vercel expects in Settings → Git
# Push to the correct branch:
git push origin your-branch:main
```

### Issue 2: Vercel Project Not Connected
Your Vercel project might have lost connection to the GitHub repo.

**Solution:**
1. In Vercel Dashboard → Settings → Git
2. Click "Disconnect" if connected
3. Click "Connect Git Repository"
4. Select GitHub and authorize
5. Choose `MagineStudios/live-story-generator`

### Issue 3: Deployments Paused
Check if deployments are paused.

**Solution:**
1. In Vercel Dashboard → Settings → Advanced
2. Look for "Pause Deployments" toggle
3. Make sure it's OFF

### Issue 4: Build Errors Preventing Deployment
Previous build errors might be blocking new deployments.

**Solution:**
1. Check Vercel Dashboard → Deployments
2. Look for failed deployments
3. Click on them to see error logs

### Issue 5: GitHub Permissions
Vercel might have lost permissions to your repository.

**Solution:**
1. Go to GitHub → Settings → Applications → Authorized OAuth Apps
2. Find Vercel and check permissions
3. Revoke and re-authorize if needed

## 4. Manual Deploy Test

To test if Vercel is working at all:

1. Go to Vercel Dashboard
2. Click on your project
3. Click "Redeploy" on the latest deployment
4. Or use Vercel CLI:
   ```bash
   npm i -g vercel
   vercel --prod
   ```

## 5. Check Vercel Logs

1. In your project dashboard, go to the "Functions" tab
2. Check for any runtime errors
3. Go to "Deployments" tab to see build logs

## 6. Webhook Issues

Sometimes GitHub webhooks to Vercel fail.

**Solution:**
1. Go to GitHub repo → Settings → Webhooks
2. Look for Vercel webhook
3. Check for recent deliveries and their status
4. Click "Redeliver" on failed ones

## 7. Force a New Connection

If all else fails:

1. Delete the project from Vercel (Settings → Advanced → Delete Project)
2. Import it again as a new project
3. Make sure to:
   - Select the correct repository
   - Configure the correct root directory (should be `.`)
   - Set all environment variables
   - Use the correct framework preset (Next.js)

## Quick Checklist

- [ ] Correct branch is being pushed to
- [ ] Git remote is correctly set
- [ ] Vercel project is connected to GitHub
- [ ] Auto-deploy is enabled
- [ ] Deployments are not paused
- [ ] No blocking build errors
- [ ] GitHub webhook is active
- [ ] Correct framework preset (Next.js) is selected
- [ ] Root directory is set correctly (`.`)

## Need More Help?

If none of these work, check:
- [Vercel Status Page](https://www.vercel-status.com/)
- [Vercel Support](https://vercel.com/support)
- Your repository settings at: https://github.com/MagineStudios/live-story-generator/settings
