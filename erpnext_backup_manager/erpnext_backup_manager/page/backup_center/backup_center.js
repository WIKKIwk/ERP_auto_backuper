frappe.provide("erpnext_backup_manager.pages");

frappe.pages["backup-center"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Backup Center"),
		single_column: true,
	});

	new erpnext_backup_manager.pages.BackupCenter(page);
};

erpnext_backup_manager.pages.BackupCenter = class BackupCenter {
	constructor(page) {
		this.page = page;
		this.uploadedDb = null;
		this.uploadedPublic = null;
		this.uploadedPrivate = null;
		this.appInstalled = this._isAppInstalled();
		this.hasAccess = this._hasAccess();

		this._buildLayout();
		if (!this.appInstalled) {
			this._showNotInstalledMessage();
			return;
		}
		if (!this.hasAccess) {
			this._showNoAccessMessage();
			return;
		}
		this._bindActions();
		this.refreshArchives();
		this._scrollToSection();
	}

	_buildLayout() {
		const styles = `
			.backup-center-wrapper {
				--backup-card-bg: var(--card-bg, #ffffff);
				--backup-border: var(--border-color, #d1d8dd);
				--backup-shadow: var(--shadow-sm, 0 6px 16px rgba(0, 0, 0, 0.08));
				--backup-accent: var(--text-muted, #6b7280);
				--backup-muted: var(--text-muted, #6b7280);
				max-width: 1100px;
				margin: 0 auto;
				padding: 1.5rem 1.25rem 2.5rem;
				position: relative;
			}
			.backup-center-wrapper > * {
				position: relative;
				z-index: 1;
			}
			.backup-center-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
				gap: 16px;
			}
			.backup-card {
				border: 1px solid var(--backup-border);
				border-radius: 16px;
				background: var(--backup-card-bg);
				padding: 18px;
				box-shadow: var(--backup-shadow);
				transition: transform 0.2s ease, box-shadow 0.2s ease;
			}
			.backup-card:hover {
				transform: translateY(-1px);
			}
			.backup-card h4 {
				margin-top: 0;
				margin-bottom: 8px;
				font-weight: 600;
			}
			.backup-card p {
				color: var(--backup-muted);
			}
			.backup-card .btn {
				border-radius: 999px;
				padding: 0.35rem 0.95rem;
			}
			.backup-card .form-control {
				border-radius: 12px;
				border: 1px solid var(--backup-border);
				background: var(--control-bg, #f7f7f7);
			}
			.backup-install-warning {
				border-radius: 12px;
			}
			.backup-permission-warning {
				border-radius: 12px;
			}
			.backup-install-warning.hide {
				display: none;
			}
			.backup-permission-warning.hide {
				display: none;
			}
			.backup-disabled .backup-card,
			.backup-disabled .backup-archive-table {
				opacity: 0.6;
				pointer-events: none;
			}
			.backup-upload-row {
				display: flex;
				flex-wrap: wrap;
				align-items: center;
				gap: 8px;
				margin-bottom: 8px;
			}
			.backup-upload-row span {
				color: var(--backup-muted);
			}
			.backup-upload-row .file-name {
				min-width: 120px;
				font-size: 0.85rem;
				color: var(--backup-muted);
			}
			.backup-archive-table table {
				margin-bottom: 0;
				border-radius: 12px;
				overflow: hidden;
			}
			.backup-archive-table th {
				background: var(--control-bg, #f7f7f7);
			}
			.backup-archive-table td {
				vertical-align: top;
			}
		`;

		this.$container = $(
			`
			<div class="backup-center-wrapper">
				<style>${styles}</style>
				<div class="alert alert-danger backup-install-warning hide"></div>
				<div class="alert alert-info backup-permission-warning hide"></div>
				<div class="backup-center-grid">
					<div class="backup-card" id="section-import">
						<h4>${__("Import (Download Backup)")}</h4>
						<p class="text-muted">${__(
							"Creates a fresh backup of database and files, then provides download links.",
						)}</p>
						<button class="btn btn-primary btn-backup">${__("Create Backup")}</button>
						<div class="backup-downloads mt-2 text-muted"></div>
					</div>
					<div class="backup-card" id="section-export">
						<h4>${__("Export (Restore)")}</h4>
						<p class="text-muted">${__(
							"Upload a backup file to restore this site. Current data will be archived first.",
						)}</p>
						<div class="backup-upload-row">
							<span>${__("DB backup (.sql.gz)")}</span>
							<button class="btn btn-default btn-upload-db">${__("Upload")}</button>
							<span class="file-name db-file-name text-muted"></span>
						</div>
						<div class="backup-upload-row">
							<span>${__("Public files (optional)")}</span>
							<button class="btn btn-default btn-upload-public">${__("Upload")}</button>
							<span class="file-name public-file-name text-muted"></span>
						</div>
						<div class="backup-upload-row">
							<span>${__("Private files (optional)")}</span>
							<button class="btn btn-default btn-upload-private">${__("Upload")}</button>
							<span class="file-name private-file-name text-muted"></span>
						</div>
						<div class="form-group mt-2">
							<input type="password" class="form-control db-root-password" placeholder="${__(
								"DB root password (optional)",
							)}">
						</div>
						<div class="form-group">
							<input type="password" class="form-control admin-password" placeholder="${__(
								"Admin password (optional)",
							)}">
						</div>
						<button class="btn btn-danger btn-restore">${__("Start Restore")}</button>
					</div>
				</div>
				<div class="backup-card mt-4" id="section-archive">
					<div class="d-flex align-items-center justify-content-between mb-2">
						<h4>${__("Archive")}</h4>
						<button class="btn btn-default btn-refresh-archive">${__("Refresh")}</button>
					</div>
					<div class="backup-archive-table"></div>
				</div>
			</div>
			`
		).appendTo(this.page.body);

		this.$backupBtn = this.$container.find(".btn-backup");
		this.$backupDownloads = this.$container.find(".backup-downloads");

		this.$uploadDbBtn = this.$container.find(".btn-upload-db");
		this.$uploadPublicBtn = this.$container.find(".btn-upload-public");
		this.$uploadPrivateBtn = this.$container.find(".btn-upload-private");
		this.$dbFileName = this.$container.find(".db-file-name");
		this.$publicFileName = this.$container.find(".public-file-name");
		this.$privateFileName = this.$container.find(".private-file-name");
		this.$dbRootPassword = this.$container.find(".db-root-password");
		this.$adminPassword = this.$container.find(".admin-password");
		this.$restoreBtn = this.$container.find(".btn-restore");

		this.$archiveTable = this.$container.find(".backup-archive-table");
		this.$refreshArchive = this.$container.find(".btn-refresh-archive");
		this.$installWarning = this.$container.find(".backup-install-warning");
		this.$permissionWarning = this.$container.find(".backup-permission-warning");
	}

	_bindActions() {
		this.$backupBtn.on("click", () => this.createBackup());
		this.$uploadDbBtn.on("click", () => this._openUploader("db"));
		this.$uploadPublicBtn.on("click", () => this._openUploader("public"));
		this.$uploadPrivateBtn.on("click", () => this._openUploader("private"));
		this.$restoreBtn.on("click", () => this.startRestore());
		this.$refreshArchive.on("click", () => this.refreshArchives());

		this.$archiveTable.on("click", ".btn-restore-archive", (event) => {
			const name = $(event.currentTarget).data("name");
			if (name) {
				this.restoreFromArchive(name);
			}
		});
	}

	_isAppInstalled() {
		const versions = frappe.boot?.versions || {};
		if (versions.erpnext_backup_manager) {
			return true;
		}
		const apps = frappe.boot?.installed_apps;
		if (Array.isArray(apps)) {
			return apps.includes("erpnext_backup_manager");
		}
		return true;
	}

	_hasAccess() {
		return frappe.user && frappe.user.has_role
			? frappe.user.has_role("System Manager")
			: false;
	}

	_showNotInstalledMessage() {
		const message = `
			<strong>${__("Backup Manager app is not installed on this site.")}</strong>
			<div class="mt-1 text-muted">${__("Please install the app and reload this page.")}</div>
		`;
		this.$installWarning.html(message).removeClass("hide");
		this.$container.addClass("backup-disabled");
		this.$container.find("button, input").prop("disabled", true);
		this.$archiveTable.html(
			`<div class="text-muted">${__("Please install the app and reload this page.")}</div>`
		);
	}

	_showNoAccessMessage() {
		const message = `
			<strong>${__("You do not have permission to access Backup Manager.")}</strong>
			<div class="mt-1 text-muted">${__("System Manager role is required.")}</div>
		`;
		this.$permissionWarning.html(message).removeClass("hide");
		this.$container.addClass("backup-disabled");
		this.$container.find("button, input").prop("disabled", true);
		this.$archiveTable.html(
			`<div class="text-muted">${__("System Manager role is required.")}</div>`
		);
	}

	_scrollToSection() {
		const params = new URLSearchParams(window.location.search);
		const section = params.get("section");
		if (!section) {
			return;
		}

		const targetIds = {
			"import": "section-import",
			"export": "section-export",
			"archive": "section-archive",
		};
		const targetId = targetIds[section];
		if (!targetId) {
			return;
		}

		const target = this.$container.find(`#${targetId}`)[0];
		if (!target) {
			return;
		}

		setTimeout(() => {
			target.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 0);
	}

	_openUploader(type) {
		const labels = {
			db: __("Upload DB Backup"),
			public: __("Upload Public Files"),
			private: __("Upload Private Files"),
		};
		const allowedByType = {
			db: [".sql", ".sql.gz", ".gz"],
			public: [".tar", ".tar.gz", ".tgz", ".gz"],
			private: [".tar", ".tar.gz", ".tgz", ".gz"],
		};
		new frappe.ui.FileUploader({
			allow_multiple: false,
			allow_toggle_private: false,
			allow_take_photo: false,
			allow_web_link: false,
			allow_google_drive: false,
			dialog_title: labels[type] || __("Upload"),
			restrictions: {
				allowed_file_types: allowedByType[type] || [".sql", ".gz"],
			},
			on_success: (file_doc) => {
				this._setUploadedFile(type, file_doc);
			},
		});
	}

	_setUploadedFile(type, file_doc) {
		const payload = {
			file_url: file_doc.file_url,
			file_name: file_doc.file_name || file_doc.file_url,
		};

		if (type === "db") {
			this.uploadedDb = payload;
			this.$dbFileName.text(payload.file_name || "");
			return;
		}

		if (type === "public") {
			this.uploadedPublic = payload;
			this.$publicFileName.text(payload.file_name || "");
			return;
		}

		if (type === "private") {
			this.uploadedPrivate = payload;
			this.$privateFileName.text(payload.file_name || "");
		}
	}

	createBackup() {
		this.$backupBtn.prop("disabled", true);
		this.$backupDownloads.text(__("Preparing backup..."));

		frappe.call({
			method: "erpnext_backup_manager.api.create_backup",
			args: {
				include_files: 1,
				bundle: 1,
			},
			callback: (r) => {
				const data = r.message || {};
				const files = data.files || {};
				const bundle = files.bundle || {};
				const db = files.db || {};

				if (bundle.url) {
					this.$backupDownloads.html(
						`<a href="${bundle.url}" target="_blank">${__("Download bundle")}</a>`
					);
					window.open(bundle.url, "_blank");
				} else if (db.url) {
					this.$backupDownloads.html(
						`<a href="${db.url}" target="_blank">${__("Download DB backup")}</a>`
					);
				} else {
					this.$backupDownloads.text(__("Backup created."));
				}

				frappe.show_alert({
					message: __("Backup created and archived."),
					indicator: "green",
				});
				this.refreshArchives();
			},
			always: () => {
				this.$backupBtn.prop("disabled", false);
			},
		});
	}

	startRestore() {
		if (!this.uploadedDb || !this.uploadedDb.file_url) {
			frappe.msgprint({
				title: __("Missing DB file"),
				message: __("Please upload the database backup file first."),
				indicator: "orange",
			});
			return;
		}

		frappe.confirm(
			__("Restore will overwrite the current database. Continue?"),
			() => {
				this._runRestore();
			}
		);
	}

	_runRestore() {
		this.$restoreBtn.prop("disabled", true);

		frappe.call({
			method: "erpnext_backup_manager.api.restore_from_upload",
			args: {
				db_file: this.uploadedDb.file_url,
				public_file: this.uploadedPublic ? this.uploadedPublic.file_url : null,
				private_file: this.uploadedPrivate ? this.uploadedPrivate.file_url : null,
				db_root_password: this.$dbRootPassword.val(),
				admin_password: this.$adminPassword.val(),
			},
			callback: (r) => {
				const data = r.message || {};
				const logUrl = data.restore_log_url;
				let message = __("Restore started. The site will be in maintenance mode.");
				if (logUrl) {
					message += `<br><a href="${logUrl}" target="_blank">${__(
						"View restore log",
					)}</a>`;
				}
				frappe.msgprint({
					title: __("Restore started"),
					message: message,
					indicator: "orange",
				});
				this.refreshArchives();
			},
			always: () => {
				this.$restoreBtn.prop("disabled", false);
			},
		});
	}

	restoreFromArchive(archiveName) {
		frappe.confirm(
			__("Restore from archive {0}? Current data will be overwritten.", [archiveName]),
			() => {
				frappe.call({
					method: "erpnext_backup_manager.api.restore_from_archive",
					args: {
						archive_name: archiveName,
						db_root_password: this.$dbRootPassword.val(),
						admin_password: this.$adminPassword.val(),
					},
					callback: (r) => {
						const data = r.message || {};
						let message = __("Restore started from archive.");
						if (data.restore_log_url) {
							message += `<br><a href="${data.restore_log_url}" target="_blank">${__(
								"View restore log",
							)}</a>`;
						}
						frappe.msgprint({
							title: __("Restore started"),
							message,
							indicator: "orange",
						});
						this.refreshArchives();
					},
				});
			}
		);
	}

	refreshArchives() {
		if (!this._isAppInstalled()) {
			this.$archiveTable.html(
				`<div class="text-muted">${__("Please install the app and reload this page.")}</div>`
			);
			return;
		}

		this.$archiveTable.html(`<div class="text-muted">${__("Loading archive...")}</div>`);
		frappe.call({
			method: "erpnext_backup_manager.api.list_archives",
			callback: (r) => {
				const rows = r.message || [];
				this._renderArchive(rows);
			},
		});
	}

	_renderArchive(rows) {
		if (!rows.length) {
			this.$archiveTable.html(`<div class="text-muted">${__("No archived backups yet.")}</div>`);
			return;
		}

		const formatSize = (value) => {
			if (!value) {
				return "";
			}
			if (frappe.form && frappe.form.formatters && frappe.form.formatters.FileSize) {
				return frappe.form.formatters.FileSize(value);
			}
			return value;
		};

		const buildFileList = (row) => {
			const fileDefs = [
				{ key: "bundle", label: __("Bundle"), pathKey: "bundle_file_path", sizeKey: "bundle_size" },
				{ key: "db", label: __("DB"), pathKey: "db_file_path", sizeKey: "db_size" },
				{ key: "public", label: __("Public"), pathKey: "public_file_path", sizeKey: "public_size" },
				{ key: "private", label: __("Private"), pathKey: "private_file_path", sizeKey: "private_size" },
				{ key: "config", label: __("Config"), pathKey: "config_file_path", sizeKey: null },
				{ key: "restore_log", label: __("Log"), pathKey: "restore_log_path", sizeKey: null },
			];

			const parts = fileDefs
				.map((file) => {
					const path = row[file.pathKey];
					const url =
						file.key === "restore_log"
							? row.restore_log_url
							: (row.downloads && row.downloads[file.key]) || "";
					if (!path || !url) {
						return "";
					}
					const rawPath = String(path || "");
					const fileName = rawPath.split("/").pop() || rawPath;
					const safeName = frappe.utils.escape_html(fileName);
					const safeLabel = frappe.utils.escape_html(file.label);
					const size = file.sizeKey ? formatSize(row[file.sizeKey]) : "";
					const sizeLabel = size ? ` (${size})` : "";
					return `<div><a href="${url}" target="_blank">${safeLabel}: ${safeName}</a>${sizeLabel}</div>`;
				})
				.filter(Boolean)
				.join("");

			return parts || `<div class="text-muted">${__("No files")}</div>`;
		};

		const body = rows
			.map((row) => {
				const restoreButton = `<button class="btn btn-xs btn-danger btn-restore-archive" data-name="${
					row.name
				}">${__("Restore")}</button>`;

				return `
					<tr>
						<td>${frappe.utils.escape_html(row.title || row.name)}</td>
						<td>${frappe.utils.escape_html(row.source || "")}</td>
						<td>${frappe.utils.escape_html(row.status || "")}</td>
						<td>${frappe.datetime.str_to_user(row.created_on || "")}</td>
						<td>${buildFileList(row)}</td>
						<td class="text-right">${restoreButton}</td>
					</tr>
				`;
			})
			.join("");

		this.$archiveTable.html(
			`
			<table class="table table-bordered">
				<thead>
					<tr>
						<th>${__("Title")}</th>
						<th>${__("Source")}</th>
						<th>${__("Status")}</th>
						<th>${__("Created On")}</th>
						<th>${__("Files")}</th>
						<th class="text-right">${__("Actions")}</th>
					</tr>
				</thead>
				<tbody>${body}</tbody>
			</table>
			`
		);
	}
};
