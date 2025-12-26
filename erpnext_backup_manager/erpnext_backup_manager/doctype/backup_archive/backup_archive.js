frappe.ui.form.on("Backup Archive", {
	refresh(frm) {
		frm.disable_save();

		if (frm.is_new()) {
			return;
		}

		const getDownloadUrl = (path) => {
			if (!path) {
				return null;
			}
			const encoded = encodeURIComponent(path);
			return frappe.urllib.get_full_url(
				`/api/method/erpnext_backup_manager.api.download_archive_file?path=${encoded}`
			);
		};

		const openDownload = (path) => {
			const url = getDownloadUrl(path);
			if (!url) {
				return;
			}
			window.open(url, "_blank");
		};

		const group = __("Download");
		const addButton = (label, path) => {
			if (!path) {
				return;
			}
			frm.add_custom_button(label, () => openDownload(path), group);
		};

		addButton(__("Download DB backup"), frm.doc.db_file_path);
		addButton(__("Download bundle"), frm.doc.bundle_file_path);
		addButton(__("Download public files"), frm.doc.public_file_path);
		addButton(__("Download private files"), frm.doc.private_file_path);
		addButton(__("Download config"), frm.doc.config_file_path);
		addButton(__("Download restore log"), frm.doc.restore_log_path);
	},
});
