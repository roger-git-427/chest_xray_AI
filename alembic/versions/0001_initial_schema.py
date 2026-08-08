"""Initial multi-clinic schema."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "clinics",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "stored_files",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("storage_key", sa.String(length=700), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=150), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index(
        "ix_stored_files_sha256", "stored_files", ["sha256"], unique=False
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "MASTER", "ADMIN", "PATIENT",
                name="userrole",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("clinic_id", sa.Uuid(), nullable=True),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=True),
        sa.Column("entity_id", sa.String(length=100), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["clinic_id"], ["clinics.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_audit_actor_created",
        "audit_events",
        ["actor_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_audit_clinic_created",
        "audit_events",
        ["clinic_id", "created_at"],
        unique=False,
    )
    op.create_table(
        "clinic_memberships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("clinic_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["clinic_id"], ["clinics.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "clinic_id", "user_id", name="uq_clinic_membership"
        ),
    )
    op.create_index(
        "ix_clinic_memberships_clinic_id",
        "clinic_memberships",
        ["clinic_id"],
        unique=False,
    )
    op.create_index(
        "ix_clinic_memberships_user_id",
        "clinic_memberships",
        ["user_id"],
        unique=False,
    )
    op.create_table(
        "studies",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("clinic_id", sa.Uuid(), nullable=False),
        sa.Column("patient_id", sa.Uuid(), nullable=True),
        sa.Column("uploaded_by_id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.Column("source_filename", sa.String(length=255), nullable=False),
        sa.Column("external_patient_id", sa.String(length=200), nullable=True),
        sa.Column("accession_number", sa.String(length=200), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING", "SCREENED", "REVIEWED", "EXPORTED",
                name="studystatus",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("is_dicom", sa.Boolean(), nullable=False),
        sa.Column("dicom_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["clinic_id"], ["clinics.id"]),
        sa.ForeignKeyConstraint(["file_id"], ["stored_files.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_id"),
    )
    op.create_index(
        "ix_studies_accession_number",
        "studies",
        ["accession_number"],
        unique=False,
    )
    op.create_index(
        "ix_studies_clinic_created",
        "studies",
        ["clinic_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_studies_clinic_id", "studies", ["clinic_id"], unique=False
    )
    op.create_index(
        "ix_studies_patient_created",
        "studies",
        ["patient_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_studies_patient_id", "studies", ["patient_id"], unique=False
    )
    op.create_index(
        "ix_studies_status", "studies", ["status"], unique=False
    )
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.LargeBinary(length=32), nullable=False),
        sa.Column("csrf_token", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_user_sessions_expires_at",
        "user_sessions",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_user_sessions_token_hash",
        "user_sessions",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_user_sessions_user_id",
        "user_sessions",
        ["user_id"],
        unique=False,
    )
    op.create_table(
        "screening_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("study_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column("overall_flagged", sa.Boolean(), nullable=False),
        sa.Column("model_version", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["study_id"], ["studies.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_screening_runs_study_created",
        "screening_runs",
        ["study_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_screening_runs_study_id",
        "screening_runs",
        ["study_id"],
        unique=False,
    )
    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("study_id", sa.Uuid(), nullable=False),
        sa.Column("screening_run_id", sa.Uuid(), nullable=True),
        sa.Column("impression", sa.Text(), nullable=False),
        sa.Column("recommendations", sa.Text(), nullable=False),
        sa.Column("clinician_name", sa.String(length=200), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "DRAFT", "FINAL",
                name="reportstatus",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("reviewed_by_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pdf_file_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["pdf_file_id"], ["stored_files.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["screening_run_id"], ["screening_runs.id"]),
        sa.ForeignKeyConstraint(
            ["study_id"], ["studies.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("study_id"),
    )
    op.create_table(
        "screening_findings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("screening_run_id", sa.Uuid(), nullable=False),
        sa.Column("condition", sa.String(length=100), nullable=False),
        sa.Column("condition_label", sa.String(length=150), nullable=False),
        sa.Column("probability", sa.Float(), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("flagged", sa.Boolean(), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column("heatmap_file_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["screening_run_id"],
            ["screening_runs.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["heatmap_file_id"], ["stored_files.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "screening_run_id", "condition", name="uq_run_condition"
        ),
    )
    op.create_index(
        "ix_screening_findings_screening_run_id",
        "screening_findings",
        ["screening_run_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("screening_findings")
    op.drop_table("reports")
    op.drop_table("screening_runs")
    op.drop_table("user_sessions")
    op.drop_table("studies")
    op.drop_table("clinic_memberships")
    op.drop_table("audit_events")
    op.drop_table("users")
    op.drop_table("stored_files")
    op.drop_table("clinics")
