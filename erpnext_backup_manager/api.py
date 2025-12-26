from __future__ import annotations

import os
import shlex
import shutil
import subprocess
import zipfile
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import quote, urlparse

import frappe
from frappe import _
from frappe.utils import get_bench_path, get_site_path, now_datetime
from frappe.utils.backups import new_backup
from frappe.utils.response import download_backup


ARCHIVE_DIRNAME = "backup_manager/archive"
ALLOWED_DB_EXTENSIONS = (".sql", ".sql.gz", ".gz")


def _ensure_system_manager() -> None:
	frappe.only_for("System Manager")


def _private_root() -> Path:
	return Path(get_site_path("private")).resolve()


def _archive_root() -> Path:
	configured = frappe.conf.get("backup_manager_archive_path")
	if configured:
		root = Path(str(configured)).expanduser()
		if not root.is_absolute():
			root = Path(get_site_path(str(configured)))
	else:
		root = Path(get_site_path("private", ARCHIVE_DIRNAME))

	root = root.resolve()
	private_root = _private_root()
	if root != private_root and private_root not in root.parents:
		frappe.throw(_("Archive path must be inside the site's private folder."), frappe.ValidationError)

	root.mkdir(parents=True, exist_ok=True)
	return root


def _to_private_relative(path: Optional[Path]) -> Optional[str]:
	if not path:
		return None
	private_root = _private_root()
	return path.resolve().relative_to(private_root).as_posix()


def _private_abs(rel_path: str) -> Path:
	private_root = _private_root()
	cleaned = (rel_path or "").strip()
	if cleaned.startswith("/private/"):
		cleaned = cleaned[len("/private/") :]
	cleaned = cleaned.lstrip("/")
	path = (private_root / cleaned).resolve()
	if not str(path).startswith(str(private_root)):
		frappe.throw(_("Invalid archive path."), frappe.ValidationError)
	return path


def _file_size(path: Optional[Path]) -> int:
	if not path or not path.exists():
		return 0
	return int(path.stat().st_size)


def _download_url(rel_path: Optional[str]) -> Optional[str]:
	if not rel_path:
		return None
	return frappe.utils.get_url(
		f"/api/method/erpnext_backup_manager.api.download_archive_file?path={quote(rel_path)}"
	)


def _build_bundle(bundle_path: Path, files: list[Optional[Path]]) -> None:
	with zipfile.ZipFile(bundle_path, "w", zipfile.ZIP_DEFLATED) as bundle:
		for file_path in files:
			if not file_path or not file_path.exists():
				continue
			bundle.write(file_path, arcname=file_path.name)


def _create_archive_record(
	*,
	title: str,
	source: str,
	status: str,
	db_path: Optional[Path],
	public_path: Optional[Path],
	private_path: Optional[Path],
	bundle_path: Optional[Path],
	config_path: Optional[Path],
	restore_log_path: Optional[Path] = None,
	notes: Optional[str] = None,
) -> frappe.model.document.Document:
	doc = frappe.new_doc("Backup Archive")
	doc.title = title
	doc.source = source
	doc.status = status
	doc.created_on = now_datetime()
	doc.created_by = frappe.session.user
	doc.db_file_path = _to_private_relative(db_path)
	doc.db_size = _file_size(db_path)
	doc.public_file_path = _to_private_relative(public_path)
	doc.public_size = _file_size(public_path)
	doc.private_file_path = _to_private_relative(private_path)
	doc.private_size = _file_size(private_path)
	doc.bundle_file_path = _to_private_relative(bundle_path)
	doc.bundle_size = _file_size(bundle_path)
	doc.config_file_path = _to_private_relative(config_path)
	doc.restore_log_path = _to_private_relative(restore_log_path)
	if notes:
		doc.notes = notes
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return doc


def _validate_db_file(path: Path) -> None:
	if not path.exists():
		frappe.throw(_("Database backup file not found."), frappe.ValidationError)
	lowered = path.name.lower()
	if not any(lowered.endswith(ext) for ext in ALLOWED_DB_EXTENSIONS):
		frappe.throw(_("Database backup must be a .sql or .sql.gz file."), frappe.ValidationError)


def _resolve_uploaded_file(file_url: str) -> Path:
	parsed = urlparse(file_url)
	path = parsed.path if parsed.scheme else file_url
	if not path:
		frappe.throw(_("Invalid file path."), frappe.ValidationError)
	if not path.startswith("/"):
		path = f"/{path}"
	if not (path.startswith("/private/") or path.startswith("/files/")):
		frappe.throw(_("Only files uploaded to this site can be restored."), frappe.ValidationError)
	abs_path = Path(get_site_path(path.lstrip("/"))).resolve()
	site_root = Path(get_site_path()).resolve()
	if not str(abs_path).startswith(str(site_root)):
		frappe.throw(_("Invalid file location."), frappe.ValidationError)
	if not abs_path.exists():
		frappe.throw(_("Uploaded file not found."), frappe.ValidationError)
	return abs_path


def _copy_to_archive(source_path: Path, target_dir: Path) -> Path:
	target_dir.mkdir(parents=True, exist_ok=True)
	destination = target_dir / source_path.name
	shutil.copy2(source_path, destination)
	return destination


def _build_restore_script(
	*,
	bench_path: str,
	bench_cmd: str,
	site: str,
	db_path: Path,
	public_path: Optional[Path],
	private_path: Optional[Path],
	db_root_username: Optional[str],
	db_root_password: Optional[str],
	admin_password: Optional[str],
	script_path: Path,
) -> None:
	restore_cmd = [
		bench_cmd,
		"--site",
		site,
		"restore",
		str(db_path),
		"--force",
	]
	if db_root_username:
		restore_cmd.extend(["--db-root-username", db_root_username])
	if db_root_password:
		restore_cmd.extend(["--db-root-password", db_root_password])
	if admin_password:
		restore_cmd.extend(["--admin-password", admin_password])
	if public_path:
		restore_cmd.extend(["--with-public-files", str(public_path)])
	if private_path:
		restore_cmd.extend(["--with-private-files", str(private_path)])

	maintenance_on = [bench_cmd, "--site", site, "set-maintenance-mode", "on"]
	maintenance_off = [bench_cmd, "--site", site, "set-maintenance-mode", "off"]
	migrate_cmd = [bench_cmd, "--site", site, "migrate"]

	lines = [
		"#!/usr/bin/env bash",
		"set -euo pipefail",
		f"cd {shlex.quote(bench_path)}",
		"cleanup() {",
		f"  {shlex.join(maintenance_off)} || true",
		"}",
		"trap cleanup EXIT",
		shlex.join(maintenance_on),
		shlex.join(restore_cmd),
		shlex.join(migrate_cmd),
		shlex.join(maintenance_off),
	]

	script_path.write_text("\n".join(lines), encoding="utf-8")
	os.chmod(script_path, 0o700)


def _start_restore(
	*,
	archive_doc: frappe.model.document.Document,
	db_path: Path,
	public_path: Optional[Path],
	private_path: Optional[Path],
	db_root_username: Optional[str],
	db_root_password: Optional[str],
	admin_password: Optional[str],
) -> Dict[str, Any]:
	_validate_db_file(db_path)

	pre_backup = create_backup(
		label=f"Pre-restore backup ({archive_doc.name})",
		include_files=1,
		bundle=1,
		source="Pre-Restore",
	)

	bench_path = get_bench_path()
	bench_cmd = shutil.which("bench")
	if not bench_cmd:
		bench_cmd = os.path.join(bench_path, "env", "bin", "bench")
	if not os.path.exists(bench_cmd):
		frappe.throw(_("Bench command not found in PATH."), frappe.ValidationError)

	backup_dir = _private_abs(archive_doc.db_file_path).parent
	timestamp = now_datetime().strftime("%Y%m%d_%H%M%S")
	log_path = backup_dir / f"restore_{timestamp}.log"
	script_path = backup_dir / f"restore_{timestamp}.sh"

	_build_restore_script(
		bench_path=bench_path,
		bench_cmd=bench_cmd,
		site=frappe.local.site,
		db_path=db_path,
		public_path=public_path,
		private_path=private_path,
		db_root_username=db_root_username,
		db_root_password=db_root_password,
		admin_password=admin_password,
		script_path=script_path,
	)

	with open(log_path, "a", encoding="utf-8") as log_file:
		subprocess.Popen(
			["bash", str(script_path)],
			stdout=log_file,
			stderr=log_file,
			cwd=bench_path,
			start_new_session=True,
		)

	archive_doc.status = "Restoring"
	archive_doc.restore_log_path = _to_private_relative(log_path)
	archive_doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {
		"status": "started",
		"archive": archive_doc.name,
		"restore_log_path": archive_doc.restore_log_path,
		"restore_log_url": _download_url(archive_doc.restore_log_path),
		"pre_restore_backup": pre_backup.get("name"),
	}


@frappe.whitelist()
def create_backup(
	label: Optional[str] = None,
	include_files: int = 1,
	bundle: int = 1,
	source: str = "Manual",
) -> Dict[str, Any]:
	_ensure_system_manager()

	include_files = bool(int(include_files or 0))
	bundle = bool(int(bundle or 0))

	timestamp = now_datetime().strftime("%Y%m%d_%H%M%S")
	stamp = f"{timestamp}_{frappe.local.site.replace('.', '_')}"
	backup_dir = _archive_root() / stamp
	backup_dir.mkdir(parents=True, exist_ok=True)

	odb = new_backup(
		ignore_files=not include_files,
		force=True,
		backup_path=str(backup_dir),
	)

	db_path = Path(odb.backup_path_db) if odb.backup_path_db else None
	public_path = Path(odb.backup_path_files) if include_files and odb.backup_path_files else None
	private_path = (
		Path(odb.backup_path_private_files)
		if include_files and odb.backup_path_private_files
		else None
	)
	config_path = Path(odb.backup_path_conf) if odb.backup_path_conf else None

	bundle_path = None
	if bundle:
		bundle_path = backup_dir / f"{stamp}_bundle.zip"
		_build_bundle(bundle_path, [db_path, public_path, private_path, config_path])

	doc = _create_archive_record(
		title=label or f"Backup {timestamp}",
		source=source or "Manual",
		status="Ready",
		db_path=db_path,
		public_path=public_path,
		private_path=private_path,
		bundle_path=bundle_path,
		config_path=config_path,
	)

	return {
		"name": doc.name,
		"title": doc.title,
		"source": doc.source,
		"files": {
			"bundle": {
				"path": doc.bundle_file_path,
				"url": _download_url(doc.bundle_file_path),
			},
			"db": {
				"path": doc.db_file_path,
				"url": _download_url(doc.db_file_path),
			},
			"public": {
				"path": doc.public_file_path,
				"url": _download_url(doc.public_file_path),
			},
			"private": {
				"path": doc.private_file_path,
				"url": _download_url(doc.private_file_path),
			},
			"config": {
				"path": doc.config_file_path,
				"url": _download_url(doc.config_file_path),
			},
		},
	}


@frappe.whitelist()
def list_archives() -> list[dict]:
	_ensure_system_manager()
	rows = frappe.get_all(
		"Backup Archive",
		fields=[
			"name",
			"title",
			"source",
			"status",
			"created_on",
			"created_by",
			"db_file_path",
			"db_size",
			"public_file_path",
			"public_size",
			"private_file_path",
			"private_size",
			"bundle_file_path",
			"bundle_size",
			"config_file_path",
			"restore_log_path",
		],
		order_by="creation desc",
	)
	for row in rows:
		row["downloads"] = {
			"bundle": _download_url(row.get("bundle_file_path")),
			"db": _download_url(row.get("db_file_path")),
			"public": _download_url(row.get("public_file_path")),
			"private": _download_url(row.get("private_file_path")),
			"config": _download_url(row.get("config_file_path")),
		}
		row["restore_log_url"] = _download_url(row.get("restore_log_path"))
	return rows


@frappe.whitelist()
def download_archive_file(path: str):
	_ensure_system_manager()
	resolved = _private_abs(path)
	rel_path = _to_private_relative(resolved)
	return download_backup(rel_path or path)


@frappe.whitelist()
def restore_from_archive(
	archive_name: str,
	db_root_username: Optional[str] = None,
	db_root_password: Optional[str] = None,
	admin_password: Optional[str] = None,
) -> Dict[str, Any]:
	_ensure_system_manager()
	archive_doc = frappe.get_doc("Backup Archive", archive_name)
	archive_doc.check_permission("write")
	if not archive_doc.db_file_path:
		frappe.throw(_("Archive is missing a database backup file."), frappe.ValidationError)

	db_path = _private_abs(archive_doc.db_file_path)
	public_path = _private_abs(archive_doc.public_file_path) if archive_doc.public_file_path else None
	private_path = _private_abs(archive_doc.private_file_path) if archive_doc.private_file_path else None

	return _start_restore(
		archive_doc=archive_doc,
		db_path=db_path,
		public_path=public_path,
		private_path=private_path,
		db_root_username=db_root_username,
		db_root_password=db_root_password,
		admin_password=admin_password,
	)


@frappe.whitelist()
def restore_from_upload(
	db_file: str,
	public_file: Optional[str] = None,
	private_file: Optional[str] = None,
	db_root_username: Optional[str] = None,
	db_root_password: Optional[str] = None,
	admin_password: Optional[str] = None,
) -> Dict[str, Any]:
	_ensure_system_manager()
	if not db_file:
		frappe.throw(_("DB backup file is required."), frappe.ValidationError)

	uploaded_db = _resolve_uploaded_file(db_file)
	uploaded_public = _resolve_uploaded_file(public_file) if public_file else None
	uploaded_private = _resolve_uploaded_file(private_file) if private_file else None

	timestamp = now_datetime().strftime("%Y%m%d_%H%M%S")
	stamp = f"{timestamp}_{frappe.local.site.replace('.', '_')}"
	upload_dir = _archive_root() / f"uploaded_{stamp}"
	upload_dir.mkdir(parents=True, exist_ok=True)

	db_path = _copy_to_archive(uploaded_db, upload_dir)
	public_path = _copy_to_archive(uploaded_public, upload_dir) if uploaded_public else None
	private_path = _copy_to_archive(uploaded_private, upload_dir) if uploaded_private else None

	doc = _create_archive_record(
		title=f"Uploaded Backup {timestamp}",
		source="Uploaded",
		status="Ready",
		db_path=db_path,
		public_path=public_path,
		private_path=private_path,
		bundle_path=None,
		config_path=None,
		notes="Uploaded via Backup Center",
	)

	return _start_restore(
		archive_doc=doc,
		db_path=db_path,
		public_path=public_path,
		private_path=private_path,
		db_root_username=db_root_username,
		db_root_password=db_root_password,
		admin_password=admin_password,
	)
