#!/usr/bin/env bash
# ==============================================================================
# CollabPEAS - GitHub Remote Setup & Push Automation Script
# ==============================================================================
set -e

echo "=========================================================="
echo "  🚀 CollabPEAS: GitHub Repository Setup & Push Utility"
echo "=========================================================="
echo ""

# 1. Check if git remote 'origin' already exists
EXISTING_REMOTE=$(git remote get-url origin 2>/dev/null || true)

if [ -n "$EXISTING_REMOTE" ]; then
    echo "Found existing remote 'origin': $EXISTING_REMOTE"
    read -p "Do you want to use this remote? (y/n, default y): " USE_EXISTING
    USE_EXISTING=${USE_EXISTING:-y}
    if [[ "$USE_EXISTING" =~ ^[Yy]$ ]]; then
        REPO_URL="$EXISTING_REMOTE"
    fi
fi

# 2. If no remote or user wants to specify new
if [ -z "$REPO_URL" ]; then
    echo "If you haven't created a repository on GitHub yet:"
    echo "  1. Open your browser and go to: https://github.com/new"
    echo "  2. Repository name: CollabPEAS"
    echo "  3. Keep it Public or Private (do NOT check Initialize with README/.gitignore/license)"
    echo "  4. Click 'Create repository'"
    echo ""
    read -p "Enter your GitHub repository URL (e.g., https://github.com/USERNAME/CollabPEAS.git): " REPO_URL
    if [ -z "$REPO_URL" ]; then
        echo "❌ Error: Repository URL cannot be empty."
        exit 1
    fi
    
    if [ -n "$EXISTING_REMOTE" ]; then
        git remote set-url origin "$REPO_URL"
    else
        git remote add origin "$REPO_URL"
    fi
fi

echo ""
echo "🔗 Remote origin set to: $REPO_URL"
echo ""

# 3. Verify current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📌 Current branch: $CURRENT_BRANCH"

# 4. Push branch and tags
echo "⬆️ Pushing commits on '$CURRENT_BRANCH' to GitHub..."
git push -u origin "$CURRENT_BRANCH"

echo ""
echo "🏷️ Pushing version tags (v0.1, v0.2, v0.3) to GitHub..."
git push origin --tags

echo ""
echo "=========================================================="
echo "  🎉 SUCCESS! Your CollabPEAS repository is now live on GitHub:"
echo "  🌐 $REPO_URL"
echo "=========================================================="
