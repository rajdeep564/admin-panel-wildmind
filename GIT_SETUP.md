# Git Setup Instructions

## Step 1: Create GitHub Repository

1. Go to [GitHub New Repository](https://github.com/new)
2. Repository name: `wildmind-admin-panel` (or your choice)
3. **Don't** initialize with README, .gitignore, or license
4. Click "Create repository"
5. **Copy the repository URL** (e.g., `https://github.com/yourusername/wildmind-admin-panel.git`)

## Step 2: Add Remote and Push

Run these commands in the `admin-panel` directory:

```bash
# Add the remote (replace YOUR_USERNAME and REPO_NAME with your actual values)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Verify remote is added
git remote -v

# Push to GitHub
git push -u origin main
```

## Alternative: Using SSH

If you prefer SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

## Troubleshooting

### If you get authentication errors:
- Use GitHub Personal Access Token instead of password
- Or set up SSH keys
- Or use GitHub CLI: `gh auth login`

### If branch name is different:
```bash
git branch -M main  # Rename current branch to main
git push -u origin main
```

### If you need to force push (be careful!):
```bash
git push -u origin main --force
```

## Next Steps After Pushing

1. Go to your GitHub repository
2. Verify all files are there
3. Follow [DEPLOY_QUICK_START.md](./DEPLOY_QUICK_START.md) for deployment

