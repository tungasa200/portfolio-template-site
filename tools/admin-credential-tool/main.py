"""Admin credential generator for the User table.

Generates (or accepts manually-entered) admin email + password, hashes the
password with bcrypt exactly the way src/lib/auth/auth.ts verifies it, and
prints the ready-to-run INSERT statement. Fully local — no DB connection,
paste the SQL into psql/Neon's SQL editor yourself.

Run:
    pip install -r requirements.txt
    python main.py
"""

from __future__ import annotations

import secrets
import string
import tkinter as tk
import uuid
from tkinter import messagebox, ttk

import bcrypt

BCRYPT_ROUNDS = 10  # must match prisma/seed.ts's bcrypt.hash(pw, 10)
ROLES = ["TENANT_OWNER", "TENANT_ADMIN", "PLATFORM_SUPERADMIN"]

AMBIGUOUS_CHARS = "Il1O0"


def random_password(length: int, avoid_ambiguous: bool) -> str:
    upper = string.ascii_uppercase
    lower = string.ascii_lowercase
    digits = string.digits
    symbols = "!@#$%^&*()-_=+[]{}"
    if avoid_ambiguous:
        upper = "".join(c for c in upper if c not in AMBIGUOUS_CHARS)
        lower = "".join(c for c in lower if c not in AMBIGUOUS_CHARS)
        digits = "".join(c for c in digits if c not in AMBIGUOUS_CHARS)

    pools = [upper, lower, digits, symbols]
    all_chars = "".join(pools)

    # Guarantee at least one char from each pool, then fill the rest randomly.
    password_chars = [secrets.choice(pool) for pool in pools]
    password_chars += [secrets.choice(all_chars) for _ in range(length - len(pools))]
    secrets.SystemRandom().shuffle(password_chars)
    return "".join(password_chars)


DEFAULT_RANDOM_EMAIL_DOMAIN = "example.com"


def random_email() -> str:
    local = f"admin-{secrets.token_hex(4)}"
    return f"{local}@{DEFAULT_RANDOM_EMAIL_DOMAIN}"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("utf-8")


def build_insert_sql(user_id: str, email: str, password_hash: str, role: str, tenant_id: str | None) -> str:
    tenant_sql = "NULL" if tenant_id is None else f"'{tenant_id}'"
    return (
        'INSERT INTO "User" '
        '(id, email, "passwordHash", role, "tenantId", "createdAt", "failedLoginAttempts", "lockedUntil")\n'
        "VALUES (\n"
        f"  '{user_id}',\n"
        f"  '{email}',\n"
        f"  '{password_hash}',\n"
        f"  '{role}',\n"
        f"  {tenant_sql},\n"
        "  now(),\n"
        "  0,\n"
        "  NULL\n"
        ");"
    )


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Admin Credential Generator")

        self._build_credentials_section()
        self._build_role_tenant_section()
        self._build_output_section()
        self._build_actions_section()
        self._build_status_bar()

        # Size to fit actual content instead of a hardcoded guess — a fixed
        # geometry() clips whatever doesn't fit instead of erroring, so any
        # future addition here would silently cut off again.
        self.resizable(True, True)
        self.update_idletasks()
        self.geometry(f"640x{self.winfo_reqheight()}")
        self.minsize(640, self.winfo_reqheight())

    # ---------------------------------------------------------------- UI ---

    def _build_credentials_section(self) -> None:
        frame = ttk.LabelFrame(self, text="Credentials", padding=12)
        frame.pack(fill="x", padx=12, pady=(12, 6))

        # Email row
        ttk.Label(frame, text="Admin email (login ID)").grid(row=0, column=0, sticky="w")
        self.email_var = tk.StringVar()
        ttk.Entry(frame, textvariable=self.email_var, width=40).grid(row=1, column=0, columnspan=2, sticky="we", pady=(2, 0))
        ttk.Button(frame, text="Random", command=self._fill_random_email).grid(row=1, column=2, padx=(8, 0))

        # Password row
        ttk.Label(frame, text="Password").grid(row=2, column=0, sticky="w", pady=(10, 0))
        self.password_var = tk.StringVar()
        self.show_password_var = tk.BooleanVar(value=True)
        self.password_entry = ttk.Entry(frame, textvariable=self.password_var, width=40)
        self.password_entry.grid(row=3, column=0, columnspan=2, sticky="we", pady=(2, 0))
        ttk.Checkbutton(
            frame, text="show", variable=self.show_password_var, command=self._toggle_password_visibility
        ).grid(row=3, column=2)

        length_frame = ttk.Frame(frame)
        length_frame.grid(row=4, column=0, columnspan=5, sticky="w", pady=(6, 0))
        ttk.Label(length_frame, text="length:").pack(side="left")
        self.password_length_var = tk.IntVar(value=20)
        ttk.Spinbox(length_frame, from_=8, to=64, textvariable=self.password_length_var, width=5).pack(side="left", padx=(4, 12))
        self.avoid_ambiguous_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(length_frame, text="avoid ambiguous chars (I/l/1/O/0)", variable=self.avoid_ambiguous_var).pack(side="left")
        ttk.Button(length_frame, text="Random", command=self._fill_random_password).pack(side="left", padx=(12, 0))
        ttk.Button(length_frame, text="Copy", command=lambda: self._copy_to_clipboard(self.password_var.get())).pack(side="left", padx=(6, 0))

        frame.columnconfigure(0, weight=1)

    def _build_role_tenant_section(self) -> None:
        frame = ttk.LabelFrame(self, text="Role & tenant", padding=12)
        frame.pack(fill="x", padx=12, pady=6)

        ttk.Label(frame, text="Role").grid(row=0, column=0, sticky="w")
        self.role_var = tk.StringVar(value=ROLES[0])
        role_combo = ttk.Combobox(frame, textvariable=self.role_var, values=ROLES, state="readonly", width=22)
        role_combo.grid(row=1, column=0, sticky="w", pady=(2, 0))
        role_combo.bind("<<ComboboxSelected>>", lambda _e: self._on_role_change())

        ttk.Label(frame, text="Tenant ID (uuid — required unless PLATFORM_SUPERADMIN)").grid(row=0, column=1, sticky="w", padx=(20, 0))
        self.tenant_var = tk.StringVar()
        self.tenant_entry = ttk.Entry(frame, textvariable=self.tenant_var, width=38)
        self.tenant_entry.grid(row=1, column=1, sticky="w", padx=(20, 0), pady=(2, 0))

        ttk.Label(
            frame,
            text='Find it via: SELECT id FROM "Tenant" WHERE slug = \'...\'; (or the seed script\'s console output)',
            foreground="#666",
        ).grid(row=2, column=0, columnspan=2, sticky="w", pady=(6, 0))

    def _build_output_section(self) -> None:
        frame = ttk.LabelFrame(self, text="Generated hash / SQL", padding=12)
        frame.pack(fill="both", expand=True, padx=12, pady=6)

        ttk.Label(frame, text="bcrypt hash").pack(anchor="w")
        hash_row = ttk.Frame(frame)
        hash_row.pack(fill="x", pady=(2, 8))
        self.hash_text = tk.Entry(hash_row, state="readonly")
        self.hash_text.pack(side="left", fill="x", expand=True)
        ttk.Button(hash_row, text="Copy", command=lambda: self._copy_to_clipboard(self._get_readonly_entry(self.hash_text))).pack(side="left", padx=(6, 0))

        ttk.Label(frame, text="SQL (run this yourself in psql / Neon's SQL editor)").pack(anchor="w")
        sql_row = ttk.Frame(frame)
        sql_row.pack(fill="both", expand=True, pady=(2, 0))
        self.sql_text = tk.Text(sql_row, height=10, wrap="none")
        self.sql_text.pack(side="left", fill="both", expand=True)
        ttk.Button(frame, text="Copy SQL", command=lambda: self._copy_to_clipboard(self.sql_text.get("1.0", "end-1c"))).pack(anchor="e", pady=(6, 0))

    def _build_actions_section(self) -> None:
        frame = ttk.Frame(self, padding=(12, 0))
        frame.pack(fill="x")
        ttk.Button(frame, text="Generate hash + SQL", command=self._generate).pack(side="left")

    def _build_status_bar(self) -> None:
        self.status_var = tk.StringVar(value="Ready.")
        bar = ttk.Label(self, textvariable=self.status_var, relief="sunken", anchor="w", padding=6)
        bar.pack(fill="x", side="bottom")

    # ------------------------------------------------------------ helpers ---

    def _get_readonly_entry(self, entry: tk.Entry) -> str:
        return entry.get()

    def _set_status(self, message: str) -> None:
        self.status_var.set(message)

    def _toggle_password_visibility(self) -> None:
        self.password_entry.config(show="" if self.show_password_var.get() else "*")

    def _on_role_change(self) -> None:
        if self.role_var.get() == "PLATFORM_SUPERADMIN":
            self.tenant_var.set("")
            self.tenant_entry.config(state="disabled")
        else:
            self.tenant_entry.config(state="normal")

    def _fill_random_email(self) -> None:
        self.email_var.set(random_email())

    def _fill_random_password(self) -> None:
        length = max(8, int(self.password_length_var.get()))
        self.password_var.set(random_password(length, self.avoid_ambiguous_var.get()))

    def _copy_to_clipboard(self, text: str) -> None:
        if not text:
            return
        self.clipboard_clear()
        self.clipboard_append(text)
        self._set_status("Copied to clipboard.")

    def _validate_inputs(self) -> tuple[str, str, str, str | None] | None:
        email = self.email_var.get().strip().lower()
        password = self.password_var.get()
        role = self.role_var.get()

        if not email or "@" not in email:
            messagebox.showerror("Invalid email", "Enter a valid admin email, or click Random.")
            return None
        if len(password) < 8:
            messagebox.showerror("Invalid password", "Password must be at least 8 characters, or click Random.")
            return None

        tenant_id: str | None = None
        if role != "PLATFORM_SUPERADMIN":
            tenant_id = self.tenant_var.get().strip()
            if not tenant_id:
                messagebox.showerror("Tenant required", "Enter the tenant's uuid, or choose PLATFORM_SUPERADMIN.")
                return None

        return email, password, role, tenant_id

    def _generate(self) -> None:
        validated = self._validate_inputs()
        if validated is None:
            return
        email, password, role, tenant_id = validated

        password_hash = hash_password(password)
        user_id = str(uuid.uuid4())
        sql = build_insert_sql(user_id, email, password_hash, role, tenant_id)

        self.hash_text.config(state="normal")
        self.hash_text.delete(0, "end")
        self.hash_text.insert(0, password_hash)
        self.hash_text.config(state="readonly")

        self.sql_text.delete("1.0", "end")
        self.sql_text.insert("1.0", sql)

        self._set_status(f"Generated hash for {email}. Copy the SQL and run it yourself.")


if __name__ == "__main__":
    App().mainloop()
