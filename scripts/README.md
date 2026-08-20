# 🛠️ Scripts for GitHub Issue Creation
## Automated Tools for Bug Remediation Project Setup

This directory contains scripts to automate GitHub Issues, Labels, and Milestones creation for the 8-week bug remediation project.

---

## 📋 Available Scripts

### 1. create-github-labels.sh
**Purpose:** Create all GitHub labels for bug tracking

**What it creates:**
- Priority labels (p0, p1, p2, p3)
- Category labels (backend, frontend, mobile, infrastructure, database, security, api-integration, testing)
- Sprint labels (sprint-1 through sprint-8)
- Status labels (blocked, in-progress, needs-review, needs-testing)
- Special labels (day-1, quick-win, good-first-issue, deferred)

**Usage:**
```bash
cd scripts
chmod +x create-github-labels.sh
./create-github-labels.sh
```

**Prerequisites:**
- GitHub CLI (gh) installed: https://cli.github.com/
- Authenticated: `gh auth login`

**Expected output:**
```
Creating GitHub Labels for Bug Tracking
✓ p0
✓ p1
...
✅ All labels created successfully!
```

---

### 2. create-sprint-milestones.sh
**Purpose:** Create Sprint milestones for all 8 weeks

**What it creates:**
- Sprint 1: Week 1 (CRITICAL Bugs)
- Sprint 2: Week 2 (Database & Security)
- Sprint 3-8: Remaining sprints with due dates

**Important:** Edit START_DATE in the script before running!

**Usage:**
```bash
cd scripts
chmod +x create-sprint-milestones.sh

# Edit the script first:
# nano create-sprint-milestones.sh
# Change: START_DATE="2025-11-25" to your actual start date

./create-sprint-milestones.sh
```

**Expected output:**
```
Creating Sprint Milestones
✓ Sprint 1
✓ Sprint 2
...
✅ All milestones created!
Sprint timeline:
  Sprint 1: 2025-11-25 - 2025-12-02
  ...
```

---

### 3. create-critical-issues.sh
**Purpose:** Create top 5 CRITICAL bug issues for Day 1

**What it creates:**
1. INFRA-001: Missing .env file
2. MOBILE-001: Undefined error variables
3. BACKEND-001: Redis null reference
4. MOBILE-003: Missing TouchableOpacity import
5. FRONTEND-019: npm audit fix

**Usage:**
```bash
cd scripts
chmod +x create-critical-issues.sh
./create-critical-issues.sh
```

**Expected output:**
```
Creating Top 5 CRITICAL Bug Issues
Creating INFRA-001...
  ✓ INFRA-001 created
Creating MOBILE-001...
  ✓ MOBILE-001 created
...
✅ Created top 5 CRITICAL issues!
```

**View created issues:**
```bash
gh issue list --label sprint-1
```

---

### 4. create-issues-from-csv.py
**Purpose:** Bulk import all bugs from CSV file

**What it does:**
- Reads bugs from CSV file
- Creates GitHub Issues with all metadata
- Handles rate limiting (1 issue per second)
- Provides progress tracking

**Usage:**
```bash
cd scripts

# Dry run (test without creating issues)
python create-issues-from-csv.py ../docs/issues-critical-sample.csv --dry-run

# Actual creation
python create-issues-from-csv.py ../docs/issues-critical-sample.csv

# For all 283 bugs (when CSV is ready)
python create-issues-from-csv.py ../docs/issues-all.csv
```

**Expected output:**
```
Creating GitHub Issues from CSV
Found 10 bugs to import
Create 10 GitHub issues? (yes/no): yes

[1/10] ✅ Created: INFRA-001: Missing .env file
[2/10] ✅ Created: MOBILE-001: Undefined error variables
...

Summary:
  ✅ Success: 10
  ❌ Failed: 0
  Total: 10
```

---

## 📂 CSV File Format

See `docs/issues-critical-sample.csv` for example format.

**Required columns:**
- BugID: Unique identifier (e.g., INFRA-001)
- Title: Issue title with emoji (e.g., 🚨 INFRA-001: Missing .env file)
- Priority: P0, P1, P2, or P3
- Category: Backend, Frontend, Mobile, etc.
- Sprint: Sprint 1, Sprint 2, etc.
- EstimatedHours: Effort estimate
- Location: File path with line numbers
- Impact: What breaks or fails
- RootCause: Why it happens
- AcceptanceCriteria: Checkboxes with success criteria
- FixApproach: How to fix it
- Dependencies: What it depends on or blocks
- Labels: Comma-separated (e.g., p0,critical,backend)
- Assignee: GitHub username (or TBD)
- Milestone: Sprint milestone name

---

## 🚀 Recommended Workflow

### Step 1: Install GitHub CLI

**macOS:**
```bash
brew install gh
```

**Windows:**
```powershell
winget install GitHub.cli
```

**Linux:**
```bash
sudo apt install gh  # Ubuntu/Debian
sudo dnf install gh  # Fedora
```

### Step 2: Authenticate

```bash
gh auth login
# Follow prompts to authenticate with GitHub
```

### Step 3: Run Scripts in Order

```bash
cd scripts

# 1. Create labels (run once)
./create-github-labels.sh

# 2. Edit and create milestones (run once)
# Edit START_DATE first!
nano create-sprint-milestones.sh
./create-sprint-milestones.sh

# 3. Create top 5 CRITICAL issues for Day 1
./create-critical-issues.sh

# 4. (Optional) Bulk import remaining bugs
python create-issues-from-csv.py ../docs/issues-critical-sample.csv

# 5. View created issues
gh issue list --limit 50
```

---

## 📝 Creating CSV for All 283 Bugs

To create GitHub Issues for all 283 bugs:

1. **Use the bug tracking spreadsheet:**
   - See `docs/BUG-TRACKING-SPREADSHEET.md`
   - Contains all 283 bugs with details

2. **Convert to CSV:**
   - Extract data from spreadsheet
   - Format as CSV following `issues-critical-sample.csv` structure
   - Save as `docs/issues-all.csv`

3. **Bulk import:**
   ```bash
   python create-issues-from-csv.py ../docs/issues-all.csv --dry-run  # Test first
   python create-issues-from-csv.py ../docs/issues-all.csv  # Actual import
   ```

---

## 🛡️ Safety Features

### Dry Run Mode
Test CSV import without creating issues:
```bash
python create-issues-from-csv.py file.csv --dry-run
```

### Rate Limiting
Scripts automatically sleep between API calls to avoid hitting GitHub's rate limits (5000 requests/hour).

### Error Handling
If a script fails:
- Partial progress is saved (created issues remain)
- Error messages show what failed
- Re-run the script (existing issues won't be duplicated)

---

## ❓ Troubleshooting

### "GitHub CLI not installed"
**Solution:** Install gh CLI from https://cli.github.com/

### "Not authenticated with GitHub"
**Solution:** Run `gh auth login` and follow prompts

### "Permission denied" on scripts
**Solution:** Make scripts executable:
```bash
chmod +x *.sh
```

### "Milestone not found"
**Solution:** Run `create-sprint-milestones.sh` first before creating issues

### "Label already exists"
**Solution:** Normal! Scripts use `--force` flag, so re-running is safe

### Issues created with wrong assignee
**Solution:** Edit CSV file and re-import, or manually update on GitHub

---

## 📊 Progress Tracking

After creating issues, track progress:

```bash
# List all sprint-1 issues
gh issue list --label sprint-1

# List all CRITICAL issues
gh issue list --label p0

# List issues by assignee
gh issue list --assignee username

# View specific issue
gh issue view 123
```

---

## 🔄 Updating Issues

To update issues after creation:

```bash
# Add label
gh issue edit 123 --add-label "in-progress"

# Change milestone
gh issue edit 123 --milestone "Sprint 2"

# Assign to user
gh issue edit 123 --add-assignee username

# Close issue
gh issue close 123
```

---

## 📚 Additional Resources

**GitHub CLI Documentation:**
- https://cli.github.com/manual/

**GitHub Issues API:**
- https://docs.github.com/en/rest/issues

**Project Board Setup:**
- See: `docs/GITHUB-ISSUES-TEMPLATE.md`

---

## ✅ Checklist

Before Sprint 1 begins:

- [ ] GitHub CLI installed and authenticated
- [ ] Labels created (run create-github-labels.sh)
- [ ] Milestones created (edit START_DATE, run create-sprint-milestones.sh)
- [ ] Top 5 CRITICAL issues created (run create-critical-issues.sh)
- [ ] (Optional) Remaining 33 CRITICAL issues created
- [ ] (Optional) All 283 bugs imported from CSV
- [ ] Issues assigned to team members
- [ ] Project board created (optional)

---

**Ready to create issues? Start with `create-github-labels.sh`!**
