```
██████╗  █████╗  ██████╗██╗  ██╗██╗   ██╗██████╗ 
██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██║   ██║██╔══██╗
██████╔╝███████║██║     █████╔╝ ██║   ██║██████╔╝
██╔══██╗██╔══██║██║     ██╔═██╗ ██║   ██║██╔═══╝ 
██████╔╝██║  ██║╚██████╗██║  ██╗╚██████╔╝██║     
╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     
                                                  
███╗   ███╗ █████╗ ███╗   ██╗ █████╗  ██████╗ ███████╗██████╗ 
████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔════╝ ██╔════╝██╔══██╗
██╔████╔██║███████║██╔██╗ ██║███████║██║  ███╗█████╗  ██████╔╝
██║╚██╔╝██║██╔══██║██║╚██╗██║██╔══██║██║   ██║██╔══╝  ██╔══██╗
██║ ╚═╝ ██║██║  ██║██║ ╚████║██║  ██║╚██████╔╝███████╗██║  ██║
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝
```

# ERPNEXT BACKUP MANAGER :: AUTOMATED DISASTER RECOVERY

```
PROJECT: ERPNext Backup Manager (Frappe Custom App)
ARCHITECTURE: Server-side Frappe application with whitelisted API endpoints
PURPOSE: One-click backup creation and restoration for ERPNext instances
PLATFORM: Frappe Framework v15+ | ERPNext v15+
AUTHOR: Abdulfattox Qurbonov
LICENSE: MIT
```

---

## SYSTEM OVERVIEW

```
Enterprise-grade backup and disaster recovery solution for ERPNext/Frappe deployments.
Provides automated backup creation, secure storage, and one-click restoration with
pre-restore safety snapshots.

OPERATIONAL FLOW
┌────────────────────────────────────────────────────────────┐
│              ERPNext/Frappe Instance                       │
│         (Running bench environment)                        │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│         Backup Manager Custom App                          │
│  ┌──────────────────────────────────────────────┐          │
│  │  Whitelisted API Endpoints                   │          │
│  │  ├── create_backup()                         │          │
│  │  ├── restore_from_archive()                  │          │
│  │  ├── restore_from_upload()                   │          │
│  │  └── list_archives()                         │          │
│  └──────────────────────────────────────────────┘          │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│         Backup Storage Architecture                        │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐   │
│  │ Database SQL   │  │ Public Files   │  │Private Files│   │
│  │ (.sql.gz)      │  │ (TAR archive)  │  │(TAR archive)│   │
│  └────────────────┘  └────────────────┘  └─────────────┘   │
│           │                  │                    │        │
│           └──────────────────┴────────────────────┘        │
│                             │                              │
│                             ▼                              │
│                  ┌────────────────────┐                    │
│                  │  ZIP Bundle File   │                    │
│                  │  (All-in-one)      │                    │
│                  └────────────────────┘                    │
└────────────────────────────────────────────────────────────┘

Storage Location:
├── Default: {site_path}/private/backup_manager/archive/
├── Custom: Configurable via site_config.json
└── Structure: Timestamped subdirectories per backup
```

---

## FEATURE MATRIX

```
BACKUP OPERATIONS
├── One-click backup creation
│   ├── Database export (compressed SQL)
│   ├── Public files archive (TAR)
│   ├── Private files archive (TAR)
│   ├── Site configuration backup
│   └── Automatic ZIP bundling
│
├── Flexible storage options
│   ├── Default: private/backup_manager/archive/
│   ├── Custom path via site_config.json
│   ├── Automatic directory creation
│   └── Path validation (security constraints)
│
└── Metadata tracking
    ├── Backup Archive DocType
    ├── Timestamp & creator logging
    ├── File size tracking
    ├── Source identification (Manual/Scheduled/Pre-Restore)
    └── Status monitoring (Ready/Restoring)

RESTORE OPERATIONS
├── Restore from existing archive
│   ├── Select from backup history
│   ├── Optional database credentials override
│   ├── Optional admin password reset
│   └── Automatic pre-restore backup
│
├── Restore from uploaded files
│   ├── Upload custom SQL backup
│   ├── Upload public/private file archives
│   ├── Validation & security checks
│   └── Archive creation for tracking
│
└── Safety mechanisms
    ├── Automatic pre-restore backup creation
    ├── Maintenance mode activation
    ├── Bash script generation for atomicity
    ├── Background process execution
    └── Automated post-restore migration

DOWNLOAD CAPABILITIES
├── Individual file downloads
│   ├── Database SQL file
│   ├── Public files TAR
│   ├── Private files TAR
│   └── Site configuration
│
└── Bundled download
    └── Single ZIP containing all backup components

SECURITY FEATURES
├── System Manager role enforcement
├── Permission-based access control
├── Path traversal prevention
├── Secure file storage (private directory)
└── Database credential protection
```

---

## TECHNICAL REQUIREMENTS

```
FRAPPE/ERPNEXT ENVIRONMENT
├── Frappe Framework: v15.x (minimum)
├── ERPNext: v15.x (optional, but recommended)
├── Python: 3.10+ (Frappe requirement)
├── Bench: Installed and configured
└── Database: MariaDB 10.6+ or PostgreSQL 12+

SYSTEM DEPENDENCIES
├── Operating System: Linux (Ubuntu 20.04+ recommended)
├── Disk Space: 2x current site size (for backup storage)
├── RAM: Adequate for bench operations
└── Permissions: User must have bench access

PYTHON REQUIREMENTS
└── frappe (managed by bench, no additional packages)

PRE-COMMIT DEVELOPMENT TOOLS
├── ruff ..................... Python linter & formatter
├── eslint ................... JavaScript linter
├── prettier ................. Code formatter
└── pyupgrade ................ Python syntax modernizer
```

---

## INSTALLATION PROTOCOLS

### [PROTOCOL 1] BENCH-BASED INSTALLATION

```bash
# Navigate to bench directory
cd /path/to/your/bench

# Fetch application from repository
bench get-app https://github.com/WIKKIwk/ERP_auto_backuper.git --branch develop

# Install on target site
bench --site your-site-name install-app erpnext_backup_manager

# Migrate database
bench --site your-site-name migrate

# Build frontend assets (if applicable)
bench build --app erpnext_backup_manager

# Restart bench services
bench restart
```

**INSTALLATION VERIFICATION:**

```bash
# Confirm app installation
bench --site your-site-name list-apps
# Expected output should include: erpnext_backup_manager

# Check DocTypes created
bench --site your-site-name console
>>> frappe.get_doc("Backup Archive")
# Should not raise "DocType not found" error
```

### [PROTOCOL 2] MANUAL INSTALLATION

```bash
# Step 1: Clone repository into apps directory
cd /path/to/bench/apps
git clone https://github.com/WIKKIwk/ERP_auto_backuper.git erpnext_backup_manager
cd erpnext_backup_manager
git checkout develop

# Step 2: Install Python package
cd /path/to/bench
source env/bin/activate
pip install -e apps/erpnext_backup_manager

# Step 3: Add to apps.txt
echo "erpnext_backup_manager" >> sites/apps.txt

# Step 4: Install on site
bench --site your-site-name install-app erpnext_backup_manager

# Step 5: Migrate
bench --site your-site-name migrate
```

---

## CONFIGURATION MATRIX

### STORAGE PATH CUSTOMIZATION

```json
// site_config.json location: /path/to/bench/sites/your-site-name/site_config.json

{
  "backup_manager_archive_path": "/custom/backup/path"
}

// OR relative to site directory:
{
  "backup_manager_archive_path": "private/custom_backups"
}
```

**SECURITY CONSTRAINTS:**

- Custom path MUST be within site's `private/` directory
- Absolute paths validated to prevent directory traversal
- Path created automatically if doesn't exist
- Default: `{site_path}/private/backup_manager/archive/`

### ROLE-BASED ACCESS CONTROL

```
Required Role: System Manager
- All API endpoints enforce System Manager role
- Users without role receive "Insufficient Permission" error
- Role assignment: ERPNext → Setup → Users → Role Assignment

Permission Hierarchy:
System Manager → Full access (create, restore, download, delete)
Other Roles → No access (app invisible in Desk)
```

---

## API REFERENCE

### CREATE BACKUP

```python
Endpoint: /api/method/erpnext_backup_manager.api.create_backup
Method: POST
Authentication: Required (System Manager)

Parameters:
├── label (str, optional): Custom backup title
├── include_files (int): 1=include files, 0=DB only (default: 1)
├── bundle (int): 1=create ZIP bundle, 0=separate files (default: 1)
└── source (str): Backup source identifier (default: "Manual")

Response: {
  "name": "BAK-2025-00123",
  "title": "Daily Backup",
  "source": "Manual",
  "files": {
    "bundle": {
      "path": "backup_manager/archive/20251226_120000_site/bundle.zip",
      "url": "/api/method/erpnext_backup_manager.api.download_archive_file?path=..."
    },
    "db": {"path": "...", "url": "..."},
    "public": {"path": "...", "url": "..."},
    "private": {"path": "...", "url": "..."},
    "config": {"path": "...", "url": "..."}
  }
}

Example Usage:
curl -X POST https://erp.example.com/api/method/erpnext_backup_manager.api.create_backup \
  -H "Authorization: token API_KEY:API_SECRET" \
  -d "label=Pre-upgrade Backup&include_files=1&bundle=1"
```

### RESTORE FROM ARCHIVE

```python
Endpoint: /api/method/erpnext_backup_manager.api.restore_from_archive
Method: POST
Authentication: Required (System Manager)

Parameters:
├── archive_name (str, required): Backup Archive DocType name
├── db_root_username (str, optional): Database root user
├── db_root_password (str, optional): Database root password
└── admin_password (str, optional): Reset Administrator password

Response: {
  "status": "started",
  "archive": "BAK-2025-00123",
  "restore_log_path": "backup_manager/.../restore_20251226_120000.log",
  "restore_log_url": "/api/method/.../download_archive_file?path=...",
  "pre_restore_backup": "BAK-2025-00124"
}

CRITICAL NOTES:
- Restore executes in BACKGROUND (non-blocking)
- Pre-restore backup created automatically
- Site enters maintenance mode during restore
- Migrations run automatically post-restore
- Check restore_log_url for progress/errors
```

### RESTORE FROM UPLOAD

```python
Endpoint: /api/method/erpnext_backup_manager.api.restore_from_upload
Method: POST
Authentication: Required (System Manager)

Parameters:
├── db_file (str, required): URL/path to uploaded SQL file
├── public_file (str, optional): URL/path to public files TAR
├── private_file (str, optional): URL/path to private files TAR
├── db_root_username (str, optional): Database root user
├── db_root_password (str, optional): Database root password
└── admin_password (str, optional): Reset Administrator password

Response: {Same as restore_from_archive}

File Upload Workflow:
[1] Upload files via ERPNext File Manager
    Navigate: Desk → File Manager → Upload
[2] Note file URLs (e.g., /private/files/backup.sql.gz)
[3] Call restore_from_upload with file URLs
[4] Monitor restore via restore_log_url
```

### LIST ARCHIVES

```python
Endpoint: /api/method/erpnext_backup_manager.api.list_archives
Method: GET
Authentication: Required (System Manager)

Response: [
  {
    "name": "BAK-2025-00123",
    "title": "Daily Backup",
    "source": "Scheduled",
    "status": "Ready",
    "created_on": "2025-12-26 12:00:00",
    "created_by": "admin@example.com",
    "db_file_path": "backup_manager/.../database.sql.gz",
    "db_size": 52428800,  // bytes
    "public_size": 104857600,
    "private_size": 10485760,
    "bundle_size": 167772160,
    "downloads": {
      "bundle": "https://erp.example.com/api/...",
      "db": "https://erp.example.com/api/...",
      ...
    }
  }
]
```

### DOWNLOAD ARCHIVE FILE

```python
Endpoint: /api/method/erpnext_backup_manager.api.download_archive_file
Method: GET
Authentication: Required (System Manager)

Parameters:
└── path (str, required): Relative path from backup list_archives response

Response: Binary file stream (automatic browser download)

Security:
- Path validation prevents directory traversal
- Only files within site's private directory downloadable
- Direct file access via URL blocked by Nginx
```

---

## OPERATIONAL PROCEDURES

### CREATING MANUAL BACKUP

```bash
# Via bench command (if app provides custom commands)
bench --site your-site-name execute erpnext_backup_manager.api.create_backup

# Via ERPNext UI (if workspace created)
# Navigate: Desk → Backup Manager → Create Backup
# Click "Create Backup" button
# Optional: Customize label, toggle files inclusion

# Via cURL (API)
curl -X POST https://your-erp-domain.com/api/method/erpnext_backup_manager.api.create_backup \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET" \
  -H "Content-Type: application/json"

# Expected Result:
# - Backup created in private/backup_manager/archive/
# - Backup Archive DocType record created
# - ZIP bundle generated (if bundle=1)
# - Download URLs returned in response
```

### RESTORING FROM BACKUP

```bash
# Step 1: List available backups
curl https://your-erp-domain.com/api/method/erpnext_backup_manager.api.list_archives \
  -H "Authorization: token API_KEY:API_SECRET"

# Step 2: Identify backup to restore (copy "name" field)

# Step 3: Initiate restore
curl -X POST https://your-erp-domain.com/api/method/erpnext_backup_manager.api.restore_from_archive \
  -H "Authorization: token API_KEY:API_SECRET" \
  -d "archive_name=BAK-2025-00123"

# Step 4: Monitor restore progress
# - Check restore_log_url from response
# - Site will be in maintenance mode during restore
# - Restore completes asynchronously (2-10 minutes typical)

# Step 5: Verify restoration
# - Site should auto-exit maintenance mode
# - Login and verify data integrity
# - Check restore log for any errors
```

### SCHEDULED BACKUPS (OPTIONAL)

```python
# Add to hooks.py (erpnext_backup_manager/hooks.py)

scheduler_events = {
    "daily": [
        "erpnext_backup_manager.tasks.daily_backup"
    ],
}

# Create tasks.py (erpnext_backup_manager/tasks.py)
import frappe
from erpnext_backup_manager.api import create_backup

def daily_backup():
    """Execute daily automated backup"""
    frappe.set_user("Administrator")
    create_backup(
        label=f"Daily Automated Backup",
        include_files=1,
        bundle=1,
        source="Scheduled"
    )
    frappe.db.commit()
```

---

## PROJECT STRUCTURE

```
erpnext_backup_manager/
├── pyproject.toml ................. Package metadata & dependencies
├── license.txt .................... MIT license
├── README.md ...................... This documentation
├── .pre-commit-config.yaml ........ Code quality automation
├── .editorconfig .................. Editor settings
├── .eslintrc ...................... JavaScript linting rules
├── .gitignore ..................... Version control exclusions
│
└── erpnext_backup_manager/ ........ Main application directory
    ├── __init__.py ................ Package initializer (version export)
    ├── hooks.py ................... Frappe app hooks (6.6KB)
    ├── api.py ..................... Core backup/restore logic (13.6KB)
    │   ├── create_backup() ........ Main backup creation function
    │   ├── restore_from_archive() . Restore existing backup
    │   ├── restore_from_upload() .. Restore uploaded files
    │   ├── list_archives() ........ List all backups
    │   └── download_archive_file() Download backup files
    ├── modules.txt ................ Module definitions
    ├── patches.txt ................ Database migration patches
    │
    ├── config/ .................... App configuration
    │   ├── __init__.py
    │   └── desktop.py ............. Desk icon/workspace config
    │
    ├── erpnext_backup_manager/ .... DocType definitions
    │   └── doctype/
    │       └── backup_archive/ .... Backup Archive DocType
    │           ├── backup_archive.json
    │           └── backup_archive.py
    │
    ├── templates/ ................. Jinja2 templates (if any)
    ├── translations/ .............. i18n translation files
    └── public/ .................... Static files (CSS/JS)
```

---

## DIAGNOSTIC PROCEDURES

### ISSUE: Backup Creation Fails

```bash
# Diagnosis Sequence
[1] Check bench logs
    tail -f /path/to/bench/logs/bench.log

[2] Verify disk space
    df -h /path/to/bench/sites/your-site-name
    # Ensure 2x current site size available

[3] Check permissions
    ls -la /path/to/bench/sites/your-site-name/private/
    # backup_manager directory should be owned by frappe user

[4] Test Frappe backup manually
    bench --site your-site-name backup
    # If this fails, issue is with Frappe core, not app

Resolution:
# Fix permissions
sudo chown -R frappe:frappe /path/to/bench/sites/your-site-name/private/

# Free disk space
sudo find /path/to/bench/sites/your-site-name/private/backup* -mtime +30 -delete

# Retry backup creation
```

### ISSUE: Restore Hangs or Fails

```bash
# Diagnosis Sequence
[1] Check restore log
    cat /path/to/bench/sites/your-site-name/private/backup_manager/.../restore_*.log

[2] Verify database credentials
    # If db_root_username/password incorrect, restore fails

[3] Check maintenance mode
    bench --site your-site-name set-maintenance-mode off
    # Manually disable if stuck

[4] Check background process
    ps aux | grep "bench.*restore"

Resolution:
# Kill stuck restore process (use with caution!)
pkill -f "bench.*restore"

# Disable maintenance mode
bench --site your-site-name set-maintenance-mode off

# Restore from pre-restore backup if data corrupted
bench --site your-site-name restore /path/to/pre_restore_backup.sql.gz

# Re-attempt restore with correct credentials
```

### ISSUE: Permission Denied Errors

```bash
# Symptom: "Insufficient Permission" when calling API

Resolution:
# Verify System Manager role assigned
[1] Login to ERPNext as Administrator
[2] Navigate: Setup → Users → [Your User]
[3] Scroll to "Roles" section
[4] Ensure "System Manager" is checked
[5] Save user

# Verify via bench console
bench --site your-site-name console
>>> frappe.get_roles("your.email@example.com")
# Should include "System Manager"
```

### ISSUE: Downloaded Files Corrupted

```bash
# Diagnosis:
# Compare file sizes - should match exactly

# Server-side file size
ls -lh /path/to/bench/sites/your-site-name/private/backup_manager/.../bundle.zip

# Downloaded file size
ls -lh ~/Downloads/bundle.zip

Resolution:
# Re-download using cURL (bypasses browser caching)
curl -OJ "https://erp.example.com/api/method/erpnext_backup_manager.api.download_archive_file?path=ENCODED_PATH" \
  -H "Authorization: token API_KEY:API_SECRET"

# Verify integrity via checksum
md5sum /path/to/server/bundle.zip
md5sum ~/Downloads/bundle.zip
# Checksums must match exactly
```

---

## SECURITY CONSIDERATIONS

```
ACCESS CONTROL
├── System Manager role required for ALL operations
├── No anonymous access permitted
├── Permission checks in every API endpoint
└── Frappe's built-in authentication used

PATH VALIDATION
├── All file operations validate paths
├── Directory traversal attacks prevented
├── Paths must be within site's private directory
└── Symlink following disabled

DATA PROTECTION
├── Backups stored in private directory (not web-accessible)
├── Download URLs require authentication
├── Database credentials never logged
├── Admin passwords redacted in logs
└── Pre-restore backups prevent data loss

BEST PRACTICES
├── Regularly rotate API keys
├── Use strong database root passwords
├── Limit System Manager role assignment
├── Encrypt backup storage at rest (server-level)
├── Implement off-site backup replication
└── Test restore procedures regularly (disaster recovery drills)
```

---

## DEVELOPMENT GUIDELINES

### PRE-COMMIT SETUP

```bash
# Navigate to app directory
cd /path/to/bench/apps/erpnext_backup_manager

# Install pre-commit framework
pip install pre-commit

# Install git hooks
pre-commit install

# Manual execution (all files)
pre-commit run --all-files

# Configured tools (automatic on git commit):
├── ruff .......... Python linting & formatting
├── eslint ........ JavaScript linting
├── prettier ...... Code formatting (JS/JSON/YAML)
└── pyupgrade ..... Python syntax modernization (3.10+)
```

### CODE QUALITY STANDARDS

```python
# Ruff configuration (pyproject.toml)
[tool.ruff]
line-length = 110
target-version = "py310"

[tool.ruff.lint]
select = ["F", "E", "W", "I", "UP", "B", "RUF"]

[tool.ruff.format]
quote-style = "double"
indent-style = "tab"

# Type hints required for all functions
def create_backup(
    label: Optional[str] = None,
    include_files: int = 1,
    bundle: int = 1,
    source: str = "Manual",
) -> Dict[str, Any]:
    ...
```

### CONTRIBUTION WORKFLOW

```
[1] Fork repository on GitHub
[2] Clone your fork locally
[3] Create feature branch (feature/backup-compression)
[4] Install pre-commit hooks
[5] Make changes following code standards
[6] Run tests (if applicable)
[7] Commit with descriptive messages
[8] Push to your fork
[9] Submit pull request to develop branch
[10] Address review feedback
```

---

## ROADMAP & ENHANCEMENTS

```
Planned Features:
├── Scheduled backup automation (built-in hooks)
├── Cloud storage integration (S3, Google Cloud, Azure)
├── Incremental backup support
├── Backup encryption at rest
├── Email notifications on backup completion
├── Web-based restore progress monitoring
├── Backup retention policies (auto-cleanup old backups)
├── Multi-site backup orchestration
└── Restore to different site (migration tool)

Performance Improvements:
├── Parallel file compression
├── Streaming backup generation (reduce memory usage)
├── Delta backups (only changed data)
└── Background job queue integration
```

---

## LICENSE

```
MIT License

Copyright (c) 2025 Abdulfattox Qurbonov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## SUPPORT & CONTRIBUTIONS

```
Issue Reporting:
Platform: GitHub Issues
URL: https://github.com/WIKKIwk/ERP_auto_backuper/issues

Required Information:
├── Frappe version: bench version
├── ERPNext version (if applicable)
├── Operating system: uname -a
├── Error logs: bench logs or restore logs
├── Steps to reproduce
└── Expected vs actual behavior

Response SLA:
├── Critical (data loss risk): 8 hours
├── High (restore failure): 24 hours
├── Medium (backup failure): 48 hours
└── Low (enhancement request): Best effort

Pull Request Guidelines:
- Target develop branch (not main)
- Include tests if adding features
- Follow code style (ruff/prettier)
- Update documentation
- Descriptive commit messages
```

---

```
PROJECT: ERPNext Backup Manager
TYPE: Frappe Custom Application
VERSION: 1.0.0
LAST_UPDATED: 2025-12-26
MAINTAINER: Abdulfattox Qurbonov
PLATFORM: Frappe v15+ | ERPNext v15+
STATUS: PRODUCTION_READY
```

**END DOCUMENTATION**
.
