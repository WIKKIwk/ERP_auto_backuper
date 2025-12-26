from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class BackupArchive(Document):
    def before_insert(self) -> None:
        if not self.created_on:
            self.created_on = now_datetime()
        if not self.created_by:
            self.created_by = frappe.session.user
