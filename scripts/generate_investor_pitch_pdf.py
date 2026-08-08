"""Generate ByteAI investor pitch PDF draft."""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parents[1] / "docs" / "ByteAI_Investor_Pitch_Draft.pdf"


class Pitch(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(20, 90, 90)
        self.cell(0, 6, "ByteAI  |  Investor Pitch Draft", align="L")
        self.set_font("Helvetica", "", 9)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, "Confidential draft", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(200, 200, 200)
        self.line(15, 14, 195, 14)
        self.ln(4)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(140, 140, 140)
        self.cell(
            0,
            8,
            f"Page {self.page_no()}/{{nb}}  |  Not a medical device  |  Decision-support only",
            align="C",
        )

    def section(self, title: str) -> None:
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(15, 70, 70)
        self.ln(2)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(45, 160, 150)
        self.set_line_width(0.5)
        y = self.get_y()
        self.line(15, y, 70, y)
        self.ln(4)

    def body(self, text: str) -> None:
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(35, 35, 35)
        self.multi_cell(self.epw, 6, text)
        self.ln(2)

    def bullet(self, text: str) -> None:
        self.set_x(self.l_margin + 3)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(35, 35, 35)
        self.multi_cell(self.epw - 3, 6, f"-  {text}")

    def kv(self, key: str, value: str) -> None:
        self.set_x(self.l_margin)
        y = self.get_y()
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(20, 90, 90)
        self.cell(48, 6, key)
        self.set_xy(self.l_margin + 48, y)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(35, 35, 35)
        self.multi_cell(self.epw - 48, 6, value)
        self.set_x(self.l_margin)
        self.ln(1)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = Pitch(format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(15, 18, 15)

    # Cover
    pdf.add_page()
    pdf.ln(40)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(15, 70, 70)
    pdf.cell(0, 12, "ByteAI", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(0, 8, "AI-assisted chest X-ray screening for private clinics")
    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 12)
    pdf.set_text_color(45, 140, 135)
    pdf.multi_cell(
        0,
        7,
        "Faster triage. Clinic-ready workflow. Clinician always in the loop.",
    )
    pdf.ln(14)
    pdf.set_draw_color(45, 160, 150)
    pdf.set_line_width(0.8)
    pdf.line(15, pdf.get_y(), 90, pdf.get_y())
    pdf.ln(10)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(
        0,
        6,
        "Investor pitch draft  |  Product V1.0 foundation  |  Mexico / LATAM focus",
    )
    pdf.ln(4)
    pdf.multi_cell(
        0,
        6,
        "Status: working multi-clinic MVP with authenticated roles, durable "
        "studies, clinician review, and patient access to finalized reports.",
    )

    # 1 Problem
    pdf.add_page()
    pdf.section("1. The problem")
    pdf.body(
        "Private clinics capture chest X-rays daily but often wait hours or "
        "days for specialist review. Existing PACS and AI tools are expensive, "
        "hospital-centric, or stuck at demo stage. Patient communication of "
        "results is fragmented (WhatsApp PDFs, paper, no portal). Clinic groups "
        "lack a controlled middle layer: one operator, many sites, role-based access."
    )
    pdf.bullet("Radiologist scarcity outside major hospital systems")
    pdf.bullet("High CXR volume with slow turnaround")
    pdf.bullet(
        "No affordable clinic-group workflow for AI triage + report delivery"
    )

    # 2 Why CXR
    pdf.section("2. Why chest X-ray first")
    pdf.body(
        "CXR is the beachhead. It is high volume, lower cost, and first-line "
        "for common thoracic findings. It fits outpatient and private-clinic "
        "economics in LATAM better than MRI/CT AI. Adjacent modalities are "
        "expansion options after the clinic wedge works - not the starting point."
    )
    pdf.bullet("Faster path to clinic ROI than advanced imaging AI")
    pdf.bullet("Clear buyer: private clinics and clinic groups")
    pdf.bullet(
        "Decision-support scope reduces early regulatory overclaim risk"
    )

    # 3 Solution
    pdf.section("3. Solution")
    pdf.body(
        "ByteAI is clinical screening infrastructure for private clinics: "
        "AI-assisted CXR triage plus multi-clinic accounts, auditability, "
        "and patient delivery of finalized reports."
    )
    pdf.bullet(
        "AI probabilities and Grad-CAM heatmaps for trained findings"
    )
    pdf.bullet(
        "Clinician review: impression, recommendations, PDF export"
    )
    pdf.bullet("Roles: Master (platform), Clinic Administrator, Patient")
    pdf.bullet(
        "Durable studies, findings, reports, and access control - not browser-only demos"
    )

    # 4 Demo
    pdf.section("4. Live product story")
    pdf.bullet("Master creates a clinic, administrator, and patient")
    pdf.bullet("Admin uploads a CXR and runs screening")
    pdf.bullet("Clinician confirms review and finalizes the report")
    pdf.bullet("Patient logs in and sees only finalized reports")
    pdf.bullet("Clinic isolation: Clinic A cannot access Clinic B")

    # 5 V1
    pdf.add_page()
    pdf.section("5. What is in V1.0 today")
    pdf.kv("Screening", "Multi-condition CXR inference + Grad-CAM heatmaps")
    pdf.kv("Workflow UI", "Spanish clinical UI, viewer, worklist, PDF report")
    pdf.kv("Security", "Auth sessions, CSRF, role-based access control")
    pdf.kv("Tenancy", "Multi-clinic memberships and isolation")
    pdf.kv("Persistence", "Studies, findings, reports, audit events")
    pdf.kv("Patient access", "Read-only portal for finalized reports")
    pdf.kv("Storage", "Private local files; Azure Blob interface ready")
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(15, 70, 70)
    pdf.cell(0, 7, "Not yet in V1.0", new_x="LMARGIN", new_y="NEXT")
    pdf.bullet("Regulatory clearance / prospective clinical validation")
    pdf.bullet("Hardened production PostgreSQL + Azure deployment")
    pdf.bullet("Email/SMS patient notification")
    pdf.bullet("Billing and subscriptions")
    pdf.ln(2)
    pdf.body(
        "Positioning: clinic MVP with real tenancy and workflow - not an "
        "FDA-cleared AI radiologist."
    )

    # 6 Future
    pdf.section("6. Future work")
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(20, 90, 90)
    pdf.cell(0, 7, "Near-term (3-6 months)", new_x="LMARGIN", new_y="NEXT")
    pdf.bullet("PostgreSQL + Azure Blob production deployment")
    pdf.bullet("Clinic onboarding pack (branding, report templates)")
    pdf.bullet(
        "Notify patient when a report is finalized (link only; no PHI in email)"
    )
    pdf.bullet("Stronger review UX and admin worklist")
    pdf.bullet("Pilots with 2-5 private clinics; measure time-to-review")
    pdf.ln(1)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(20, 90, 90)
    pdf.cell(0, 7, "Mid-term (6-18 months)", new_x="LMARGIN", new_y="NEXT")
    pdf.bullet("Clinical validation protocol as decision-support")
    pdf.bullet("Additional CXR findings only after performance bar")
    pdf.bullet("Master audit dashboard; retention/compliance policies")
    pdf.bullet("DICOM send / lightweight PACS import")
    pdf.ln(1)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(20, 90, 90)
    pdf.cell(0, 7, "Longer-term (optional)", new_x="LMARGIN", new_y="NEXT")
    pdf.bullet(
        "Adjacent modalities only after CXR clinic retention and revenue"
    )
    pdf.bullet("White-label / clinic-group marketplace options")

    # 7-10
    pdf.add_page()
    pdf.section("7. Business model (draft)")
    pdf.bullet("SaaS per clinic / per site + usage (studies per month)")
    pdf.bullet("Master account for clinic groups and chains")
    pdf.bullet(
        "Premium options: support, branded reports, longer retention"
    )
    pdf.body(
        "Pricing claims stay conservative until pilot evidence exists."
    )

    pdf.section("8. Moat (honest)")
    pdf.body(
        "Early advantage is workflow and distribution, not unique model "
        "weights alone:"
    )
    pdf.bullet("Clinic and patient account graph")
    pdf.bullet("Review / finalize / export audit trail")
    pdf.bullet("Spanish product fit for LATAM private clinics")
    pdf.bullet(
        "Model quality becomes a moat later through local data partnerships"
    )

    pdf.section("9. How we talk to investors")
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(20, 90, 90)
    pdf.cell(0, 7, "Say", new_x="LMARGIN", new_y="NEXT")
    pdf.bullet("Decision support for preliminary triage")
    pdf.bullet("Clinician confirmation required before patient access")
    pdf.bullet("Multi-clinic SaaS foundation already built")
    pdf.ln(1)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(20, 90, 90)
    pdf.cell(0, 7, "Do not say", new_x="LMARGIN", new_y="NEXT")
    pdf.bullet("Replaces radiologists")
    pdf.bullet("Diagnoses disease autonomously")
    pdf.bullet("Ready for national health systems tomorrow")

    pdf.section("10. The ask (example framing)")
    pdf.body(
        "Capital for 3-5 clinic pilots, cloud production, clinical advisory, "
        "and 1-2 engineers. Milestones: production deploy, N clinics live, "
        "median report turnaround, validation protocol started."
    )

    pdf.section("Elevator pitch")
    pdf.body(
        "ByteAI helps private clinics triage chest X-rays with AI, then finish "
        "the job where most tools stop: clinic administration, clinician "
        "review, and patient access to finalized reports. Our V1 is a working "
        "multi-clinic product with authenticated roles and durable study "
        "records. We are raising to put it into production cloud, run paid "
        "pilots in Mexico, and start clinical validation - expanding findings "
        "only after the clinic workflow proves retention and revenue."
    )

    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(
        0,
        5,
        "Disclaimer: ByteAI outputs are decision-support signals only. A "
        "licensed clinician must interpret every study before clinical action. "
        "This document is a draft for discussion and does not constitute an "
        "offer to sell securities.",
    )

    pdf.output(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
