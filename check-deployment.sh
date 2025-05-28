#!/bin/bash

echo "🔍 Checking Git and Vercel deployment setup..."
echo ""

# Check Git status
echo "📋 Git Status:"
git status
echo ""

# Check current branch
echo "🌿 Current Branch:"
git branch --show-current
echo ""

# Check remote
echo "🔗 Git Remote:"
git remote -v
echo ""

# Check last commit
echo "📝 Last Commit:"
git log -1 --oneline
echo ""

# Check if there are unpushed commits
echo "📤 Unpushed Commits:"
git log origin/$(git branch --show-current)..HEAD --oneline
if [ $? -eq 0 ]; then
    echo "No unpushed commits"
fi
echo ""

echo "✅ To push your changes:"
echo "git push origin $(git branch --show-current)"
echo ""

echo "🚀 To manually deploy with Vercel CLI:"
echo "npx vercel --prod"
