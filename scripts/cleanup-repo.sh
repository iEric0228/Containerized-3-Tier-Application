#!/bin/bash
# Clean up repository and remove unwanted files from git tracking

echo "🧹 Repository Cleanup Script"
echo "============================"
echo ""

# Set error handling
set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Removing node_modules from git tracking...${NC}"
git rm -r --cached node_modules/ 2>/dev/null || echo "  ℹ️  node_modules/ not tracked"
git rm -r --cached "node_modules 2/" 2>/dev/null || echo "  ℹ️  'node_modules 2/' not tracked"
git rm -r --cached backend/node_modules/ 2>/dev/null || echo "  ℹ️  backend/node_modules/ not tracked"
git rm -r --cached backend/"node_modules 2/" 2>/dev/null || echo "  ℹ️  backend/'node_modules 2/' not tracked"
git rm -r --cached frontend/node_modules/ 2>/dev/null || echo "  ℹ️  frontend/node_modules/ not tracked"

echo -e "${YELLOW}Step 2: Removing build artifacts...${NC}"
git rm -r --cached build/ 2>/dev/null || echo "  ℹ️  build/ not tracked"
git rm -r --cached dist/ 2>/dev/null || echo "  ℹ️  dist/ not tracked"
git rm -r --cached coverage/ 2>/dev/null || echo "  ℹ️  coverage/ not tracked"
git rm -r --cached frontend/build/ 2>/dev/null || echo "  ℹ️  frontend/build/ not tracked"
git rm -r --cached frontend/coverage/ 2>/dev/null || echo "  ℹ️  frontend/coverage/ not tracked"
git rm -r --cached backend/coverage/ 2>/dev/null || echo "  ℹ️  backend/coverage/ not tracked"

echo -e "${YELLOW}Step 3: Removing monitoring data directories...${NC}"
git rm -r --cached monitoring/loki/ 2>/dev/null || echo "  ℹ️  monitoring/loki/ not tracked"
git rm -r --cached monitoring/mimir/ 2>/dev/null || echo "  ℹ️  monitoring/mimir/ not tracked"
git rm -r --cached monitoring/tempo/ 2>/dev/null || echo "  ℹ️  monitoring/tempo/ not tracked"
git rm -r --cached monitoring/promtail/ 2>/dev/null || echo "  ℹ️  monitoring/promtail/ not tracked"
git rm -r --cached monitoring/otel/ 2>/dev/null || echo "  ℹ️  monitoring/otel/ not tracked"

echo -e "${YELLOW}Step 4: Removing duplicate package-lock files...${NC}"
git rm --cached "package-lock 2.json" 2>/dev/null || echo "  ℹ️  'package-lock 2.json' not tracked"
git rm --cached backend/"package-lock 2.json" 2>/dev/null || echo "  ℹ️  backend/'package-lock 2.json' not tracked"
git rm --cached frontend/"package-lock 2.json" 2>/dev/null || echo "  ℹ️  frontend/'package-lock 2.json' not tracked"

echo -e "${YELLOW}Step 5: Removing OS-specific files...${NC}"
git rm --cached .DS_Store 2>/dev/null || echo "  ℹ️  .DS_Store not tracked"
find . -name ".DS_Store" -type f -exec git rm --cached {} \; 2>/dev/null || echo "  ℹ️  No .DS_Store files to remove"

echo -e "${YELLOW}Step 6: Removing Terraform state and lock files...${NC}"
find terraform -name "*.tfstate*" -exec git rm --cached {} \; 2>/dev/null || echo "  ℹ️  No tfstate files to remove"
find terraform -name ".terraform.lock.hcl" -exec git rm --cached {} \; 2>/dev/null || echo "  ℹ️  No lock.hcl files to remove"

echo -e "${YELLOW}Step 7: Removing log files...${NC}"
find . -name "*.log" -type f -exec git rm --cached {} \; 2>/dev/null || echo "  ℹ️  No log files to remove"

echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Commit changes: git commit -m 'chore: clean up repository and update .gitignore'"
echo "  3. Push to remote: git push"
echo ""
echo "To physically delete these files from your local directory:"
echo "  npm run clean  # or manually delete node_modules, build, coverage directories"
