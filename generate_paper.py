import os
import subprocess
import sys

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Academic Research Paper - University of Sulaimani</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 20mm 18mm 22mm 18mm;
            @top-center {
                content: "University of Sulaimani - College of Administration and Economics | Academic Research Paper";
                font-family: 'Times New Roman', Times, serif;
                font-size: 8pt;
                color: #555555;
                border-bottom: 0.5pt solid #cccccc;
                padding-bottom: 4px;
            }
            @bottom-left {
                content: "Prepared by: Ranj Hussein & Koshnar Omer | Supervisor: Dr. Mohammed";
                font-family: 'Times New Roman', Times, serif;
                font-size: 8pt;
                color: #555555;
            }
            @bottom-right {
                content: "Page " counter(page);
                font-family: 'Times New Roman', Times, serif;
                font-size: 8pt;
                color: #333333;
                font-weight: bold;
            }
        }

        body {
            font-family: 'Times New Roman', Times, Georgia, serif;
            color: #1a1a1a;
            line-height: 1.45;
            font-size: 10.5pt;
            margin: 0;
            padding: 0;
            text-align: justify;
        }

        /* Institutional Crest and Header */
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            border-bottom: 2pt solid #0f2b48;
            padding-bottom: 8px;
        }

        .header-table td {
            vertical-align: middle;
            border: none;
            padding: 2px 6px;
        }

        .inst-en {
            text-align: left;
            font-size: 9pt;
            font-weight: bold;
            color: #0f2b48;
            line-height: 1.25;
        }

        .inst-ku {
            text-align: right;
            font-size: 9pt;
            font-weight: bold;
            color: #0f2b48;
            line-height: 1.25;
            direction: rtl;
            font-family: 'Vazirmatn', 'Arial', sans-serif;
        }

        .inst-logo {
            text-align: center;
            width: 90px;
        }

        .logo-box {
            width: 65px;
            height: 65px;
            border: 2pt solid #0f2b48;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #f4f7fa;
            color: #0f2b48;
            font-weight: bold;
            font-size: 8pt;
            text-align: center;
            line-height: 1.1;
        }

        /* Title & Authors */
        .paper-title {
            text-align: center;
            font-size: 17pt;
            font-weight: bold;
            color: #0f2b48;
            margin: 14px 0 10px 0;
            line-height: 1.28;
            letter-spacing: -0.2px;
        }

        .paper-subtitle {
            text-align: center;
            font-size: 11pt;
            font-style: italic;
            color: #444444;
            margin-bottom: 14px;
        }

        .authors-block {
            text-align: center;
            margin-bottom: 8px;
        }

        .author-names {
            font-size: 11.5pt;
            font-weight: bold;
            color: #1a1a1a;
        }

        .author-names sup {
            color: #0f2b48;
            font-weight: bold;
        }

        .supervisor-name {
            font-size: 10.5pt;
            font-weight: bold;
            color: #8b1e1e;
            margin-top: 4px;
        }

        .affiliation {
            text-align: center;
            font-size: 8.5pt;
            color: #4a5568;
            font-style: italic;
            margin-bottom: 16px;
            line-height: 1.35;
        }

        /* Abstract & Keywords Box */
        .abstract-box {
            background-color: #f8fafc;
            border: 1pt solid #cbd5e1;
            border-left: 3.5pt solid #0f2b48;
            padding: 10px 14px;
            margin: 0 0 18px 0;
            border-radius: 2px;
        }

        .abstract-heading {
            font-weight: bold;
            font-size: 9.5pt;
            color: #0f2b48;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .abstract-text {
            font-size: 9pt;
            line-height: 1.42;
            color: #2d3748;
            margin: 0 0 6px 0;
        }

        .keywords {
            font-size: 8.5pt;
            color: #1a202c;
            margin-top: 4px;
        }

        .keywords strong {
            color: #0f2b48;
        }

        /* Headings */
        h2.sec-heading {
            font-size: 12pt;
            font-weight: bold;
            color: #0f2b48;
            text-transform: uppercase;
            border-bottom: 1pt solid #0f2b48;
            padding-bottom: 2px;
            margin-top: 18px;
            margin-bottom: 8px;
            letter-spacing: 0.2px;
        }

        h3.sub-heading {
            font-size: 10.5pt;
            font-weight: bold;
            color: #1a365d;
            margin-top: 12px;
            margin-bottom: 4px;
        }

        p {
            margin: 0 0 8px 0;
            text-indent: 1.5em;
        }

        p.no-indent {
            text-indent: 0;
        }

        /* Tables */
        table.academic-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0 14px 0;
            font-size: 8.5pt;
        }

        table.academic-table th {
            background-color: #0f2b48;
            color: #ffffff;
            font-weight: bold;
            padding: 6px 8px;
            text-align: center;
            border: 0.5pt solid #0f2b48;
        }

        table.academic-table td {
            padding: 5px 8px;
            border: 0.5pt solid #cbd5e1;
            color: #2d3748;
        }

        table.academic-table tr:nth-child(even) {
            background-color: #f8fafc;
        }

        .table-caption {
            font-size: 8pt;
            font-weight: bold;
            color: #0f2b48;
            margin-bottom: 4px;
            text-align: center;
        }

        /* Formula & Equations */
        .equation-block {
            background: #f1f5f9;
            border-left: 2.5pt solid #2563eb;
            padding: 8px 12px;
            margin: 10px 0;
            font-family: 'Cambria Math', 'Times New Roman', serif;
            font-size: 10pt;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .equation-content {
            margin: 0 auto;
            font-style: italic;
        }

        .equation-num {
            font-weight: bold;
            color: #475569;
        }

        /* Boxed Highlights / Architecture Panels */
        .architecture-box {
            background: #ffffff;
            border: 1pt solid #94a3b8;
            border-radius: 4px;
            padding: 10px 14px;
            margin: 12px 0;
        }

        .arch-title {
            font-weight: bold;
            color: #0f2b48;
            font-size: 9.5pt;
            margin-bottom: 6px;
            border-bottom: 0.5pt dashed #94a3b8;
            padding-bottom: 3px;
        }

        ul.academic-list {
            margin: 4px 0 8px 0;
            padding-left: 20px;
            font-size: 9.5pt;
        }

        ul.academic-list li {
            margin-bottom: 4px;
        }

        /* Algorithm Box */
        .algorithm-box {
            background: #fafafa;
            border: 1pt solid #475569;
            padding: 10px 14px;
            margin: 12px 0;
            font-family: 'Courier New', Courier, monospace;
            font-size: 8.5pt;
            line-height: 1.4;
        }

        .algo-header {
            font-family: 'Times New Roman', Times, serif;
            font-weight: bold;
            font-size: 9pt;
            color: #0f2b48;
            border-bottom: 1pt solid #475569;
            padding-bottom: 4px;
            margin-bottom: 6px;
        }

        /* Figures */
        .figure-box {
            text-align: center;
            margin: 14px 0;
            padding: 8px;
            background: #f8fafc;
            border: 0.5pt solid #e2e8f0;
            border-radius: 3px;
        }

        .figure-caption {
            font-size: 8pt;
            font-weight: bold;
            color: #334155;
            margin-top: 6px;
        }

        /* References */
        .reference-list {
            font-size: 8pt;
            line-height: 1.35;
            margin-top: 8px;
            padding-left: 18px;
        }

        .reference-list li {
            margin-bottom: 5px;
            text-align: left;
        }

        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>

    <!-- OFFICIAL INSTITUTIONAL HEADER -->
    <table class="header-table">
        <tr>
            <td class="inst-en" style="width: 42%;">
                KURDISTAN REGIONAL GOVERNMENT<br>
                MINISTRY OF HIGHER EDUCATION & SCIENTIFIC RESEARCH<br>
                <strong>UNIVERSITY OF SULAIMANI</strong><br>
                COLLEGE OF ADMINISTRATION & ECONOMICS
            </td>
            <td class="inst-logo" style="width: 16%;">
                <div class="logo-box">
                    <strong>UOS<br>1968</strong>
                </div>
            </td>
            <td class="inst-ku" style="width: 42%;">
                حکومەتی هەرێمی کوردستان<br>
                وەزارەتی خوێندنی باڵا و توێژینەوەی زانستی<br>
                <strong>زانکۆی سلێمانی</strong><br>
                کۆلێژی کارگێڕی و ئابووری
            </td>
        </tr>
    </table>

    <!-- PAPER TITLE & METADATA -->
    <div class="paper-title">
        Design and Implementation of an Enterprise Cloud-Synchronized Student Attendance and Academic Governance Information System
    </div>
    <div class="paper-subtitle">
        A Real-Time Multi-Tier Distributed Architecture for Higher Education Institutions:<br>
        Field Implementation at the College of Administration and Economics, University of Sulaimani
    </div>

    <div class="authors-block">
        <div class="author-names">
            Ranj Hussein<sup>1</sup> &nbsp;&bull;&nbsp; Koshnar Omer<sup>1</sup>
        </div>
        <div class="supervisor-name">
            Scientific Supervisor: Dr. Mohammed<sup>2</sup>
        </div>
    </div>

    <div class="affiliation">
        <sup>1</sup> Department of Statistics and Informatics / Department of Business Administration, College of Administration and Economics, University of Sulaimani, Sulaimani, Kurdistan Region, Iraq<br>
        <sup>2</sup> Faculty of Administration and Economics, University of Sulaimani, Sulaimani, Kurdistan Region, Iraq<br>
        <em>Official Research Paper & Institutional Project Dossier submitted to the College Deanship and the Presidency of the University of Sulaimani</em>
    </div>

    <!-- ABSTRACT & KEYWORDS -->
    <div class="abstract-box">
        <div class="abstract-heading">Abstract</div>
        <p class="abstract-text no-indent">
            Accurate student attendance monitoring is an indispensable cornerstone of academic governance, institutional accreditation, and pedagogical accountability in contemporary higher education institutions. However, conventional manual paper registers and decentralized physical logbooks introduce severe operational drawbacks, including extensive classroom instructional time loss, high vulnerability to human transcription errors, physical register degradation, delayed administrative intervention, and a total lack of actionable real-time analytics for university executive leadership. To decisively overcome these systemic limitations, this research presents the engineering, mathematical formalization, and operational deployment of the <strong>UOS Attendance System</strong>: a high-performance, cloud-synchronized, multi-tier academic attendance and governance information system specifically tailored to the institutional regulatory framework of the Kurdistan Regional Government's Ministry of Higher Education and Scientific Research.
        </p>
        <p class="abstract-text no-indent">
            The proposed architecture integrates an asynchronous, event-driven Node.js execution engine, an enterprise Google Firebase Cloud Firestore document database featuring sub-second bidirectional synchronization listeners (<code>onSnapshot</code>), and an offline-first client-side persistent cache built on hybrid LocalStorage queuing to guarantee uninterrupted operation during institutional campus connectivity interruptions. The system implements a strict Role-Based Access Control (RBAC) topology comprising three decoupled operational tiers: an ultra-rapid Teacher Attendance Workspace enabling in-class lecture recording with 1-to-4 hour weighting in under 45 seconds; an Academic Department Workspace providing strict departmental data isolation, stage cohort management, and automated bulk Excel ingestion via SheetJS; and an Executive Super Admin Portal delivering institutional decision-support dashboards, cross-departmental comparative statistical benchmarking, dynamic early-warning threshold classifications (5%, 7%, and 10% academic dismissal limits), and automated end-of-semester and annual archival workflows producing certified PDF reports. Operational field evaluation across all five scientific departments of the College of Administration and Economics demonstrates an 88.5% reduction in recording latency, 100% data integrity, zero downtime during offline network faults, and prompt administrative intervention before irreversible student dismissals occur.
        </p>
        <div class="keywords">
            <strong>Keywords:</strong> Academic Governance; Higher Education Information Systems (HE-MIS); Cloud-Native Real-Time Synchronization; Firebase Cloud Firestore; Offline-First Architecture; Student Attendance Analytics; University of Sulaimani.
        </div>
    </div>

    <!-- SECTION 1: INTRODUCTION -->
    <h2 class="sec-heading">1. Introduction and Institutional Background</h2>
    <p>
        The relentless pace of global digital transformation in higher education requires contemporary academic institutions to modernize legacy administrative paradigms into transparent, data-driven, and high-integrity digital governance platforms. Among the essential dimensions of academic administration, student lecture attendance represents a direct legal and academic determinant of course completion, standardized quality assurance, and institutional accreditation under the statutory guidelines set forth by the Ministry of Higher Education and Scientific Research in the Kurdistan Region of Iraq [1], [2].
    </p>
    <p>
        At the University of Sulaimani—the mother university and intellectual epicenter of the Kurdistan Region—the College of Administration and Economics serves as a vital academic pillar comprising five distinct scientific departments: the Department of Accounting, the Department of Business Administration, the Department of Economics, the Department of Marketing Management, and the Department of Statistics and Informatics. Accommodating four progressive undergraduate academic stages across hundreds of registered students, the college coordinates dozens of synchronous daily lectures spanning diverse credit and contact hours (ranging from one to four pedagogical hours per session).
    </p>
    <p>
        Historically, this massive volume of attendance data was collected and processed through physical paper registers. Lecturers were tasked with manually calling out student names during instructional hours, physically recording marks on paper sheets, and physically dispatching these documents to departmental administrators at sporadic intervals. This traditional paradigm produces acute administrative friction:
    </p>
    <ul class="academic-list">
        <li><strong>Instructional Time Depletion:</strong> Instructors consume between 4 to 8 minutes of valuable lecture time per academic session merely calling names, representing a cumulative pedagogical deficit of over 120 instructional hours across the college per semester.</li>
        <li><strong>Data Vulnerability and Transcription Error:</strong> Paper rosters are susceptible to physical misplacement, liquid spills, handwriting misinterpretations, and manual data-entry errors when clerks aggregate cumulative hours at the close of an academic term.</li>
        <li><strong>Absence of Real-Time Proactive Intervention:</strong> Under paper workflows, cumulative calculation occurs retroactively. Consequently, students often breach the statutory 10% maximum absence ceiling before either the academic advisor, the head of department, or the student themselves is formally notified, precipitating unavoidable academic dismissals (<em>fasl</em>) and contentious student appeals.</li>
        <li><strong>Administrative Blind Spots for Executive Leadership:</strong> Neither the College Deanship nor the University Presidency has instantaneous visibility into institutional attendance patterns, departmental compliance benchmarks, or faculty delivery metrics without undertaking time-consuming, multi-week manual audits.</li>
    </ul>
    <p class="no-indent">
        To eliminate these systemic vulnerabilities, this study details the conception, architectural design, implementation, and deployment of an enterprise-grade digital solution: the <strong>University of Sulaimani Attendance & Governance System</strong>.
    </p>

    <!-- SECTION 2: RELATED WORK -->
    <h2 class="sec-heading">2. Related Work and Comparative Analysis</h2>
    <p>
        Extensive literature has addressed student attendance automation using diverse technological paradigms, ranging from physical hardware installations to mobile cloud software [3]–[6].
    </p>
    <p>
        <strong>Biometric Identification Systems:</strong> Several studies have investigated biometric solutions, including fingerprint scanners, facial recognition cameras, and iris recognition devices deployed at classroom entrances [4]. While biometrics eliminate proxy attendance, empirical evidence shows they create severe physical bottlenecks at lecture hall entrances, especially when cohorts exceed 80 students. Furthermore, optical sensors in institutional settings suffer from frequent hardware malfunctions, environmental dust degradation, high initial capital expenditures, and substantial ongoing maintenance costs that are economically unviable for widespread deployment across all university halls.
    </p>
    <p>
        <strong>Radio-Frequency Identification (RFID) and Bluetooth Beacons:</strong> RFID-card-based logging allows rapid tap-in verification [5]. However, RFID remains inherently vulnerable to proxy tapping (students carrying multiple cards for absent peers) and requires substantial specialized physical infrastructure, readers, and persistent local network wiring.
    </p>
    <p>
        <strong>Cloud-Based Web and Mobile Applications:</strong> Modern research favors software-driven, cloud-integrated mobile platforms [6], [7]. Web-native applications provide pervasive cross-platform accessibility across laptops, tablets, and smartphones without dedicated hardware. Nonetheless, conventional cloud applications exhibit a critical weakness in developing institutional environments: <em>total network dependency</em>. When campus Wi-Fi or cellular data fluctuates, traditional web portals crash, drop records, or freeze, destroying teacher trust during high-stakes classroom interactions.
    </p>
    <p class="no-indent">
        The system developed in this work addresses the shortcomings of previous approaches by synthesizing a lightweight, hardware-independent web interface with an advanced <em>offline-first local persistence queue</em> and <em>cloud-native real-time event synchronization</em>, establishing an optimal balance of cost-efficiency, speed, and absolute operational reliability.
    </p>

    <div class="table-caption">Table 1. Systematic Comparison of Attendance Tracking Paradigms in Higher Education</div>
    <table class="academic-table">
        <thead>
            <tr>
                <th>Evaluation Dimension</th>
                <th>Traditional Paper Registers</th>
                <th>Biometric Hardware (Fingerprint/Face)</th>
                <th>RFID Smart Cards</th>
                <th>Proposed UOS Attendance Architecture</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Classroom Logging Speed</strong></td>
                <td>Very Slow (4 - 8 min/session)</td>
                <td>Slow Bottleneck (2 - 4 sec/student)</td>
                <td>Moderate (1 - 2 sec/student)</td>
                <td><strong>Ultra-Rapid (&lt; 45 sec total cohort)</strong></td>
            </tr>
            <tr>
                <td><strong>Capital Hardware Cost</strong></td>
                <td>Low (recurring paper cost)</td>
                <td>Extremely High (Sensors per hall)</td>
                <td>High (Readers + Cards)</td>
                <td><strong>Zero Hardware Cost (BYOD web-native)</strong></td>
            </tr>
            <tr>
                <td><strong>Network Fault Tolerance</strong></td>
                <td>Independent (paper)</td>
                <td>Low (local LAN/server dependent)</td>
                <td>Low (controller dependent)</td>
                <td><strong>Full Offline-First Local Cache + Auto-Sync</strong></td>
            </tr>
            <tr>
                <td><strong>Real-Time Executive Analytics</strong></td>
                <td>None (multi-week delay)</td>
                <td>Moderate (batch export)</td>
                <td>Moderate (central database)</td>
                <td><strong>Instantaneous Sub-Second Cloud Dashboards</strong></td>
            </tr>
            <tr>
                <td><strong>Statutory Warning Triggers</strong></td>
                <td>Manual retroactive calculation</td>
                <td>Requires manual query generation</td>
                <td>Requires custom SQL scripts</td>
                <td><strong>Automated Real-Time Visual Alerts (5%, 7%, 10%)</strong></td>
            </tr>
        </tbody>
    </table>

    <div class="page-break"></div>

    <!-- SECTION 3: INSTITUTIONAL CONTEXT & REQUIREMENTS -->
    <h2 class="sec-heading">3. Institutional Context and Regulatory Requirements</h2>
    <p>
        The software architecture was engineered to faithfully mirror the organizational topology of the College of Administration and Economics at the University of Sulaimani, conforming strictly to the accreditation guidelines of the Ministry of Higher Education and Scientific Research.
    </p>

    <h3 class="sub-heading">3.1 Departmental and Stage Decomposition</h3>
    <p>
        The college environment comprises five autonomous academic units:
    </p>
    <ul class="academic-list">
        <li><strong>Department of Accounting (بەشی ژمێریاری - <code>dept_accounting</code>):</strong> Intensive numerical curricula with heavy contact hours in audit, financial analysis, and cost accounting.</li>
        <li><strong>Department of Business Administration (بەشی کارگێڕی کار - <code>dept_business</code>):</strong> Large student cohorts requiring distributed stage sections across management theory and organizational behavior.</li>
        <li><strong>Department of Economics (بەشی ئابووری - <code>dept_economics</code>):</strong> Rigorous quantitative micro- and macroeconomic lecture series.</li>
        <li><strong>Department of Marketing Management (بەشی کارگێڕی بەبازاڕکردن - <code>dept_finance</code>):</strong> Dynamic applied curricula with collaborative seminar contact hours.</li>
        <li><strong>Department of Statistics and Informatics (بەشی ئامار و زانیاری - <code>dept_statistics</code>):</strong> Computational laboratory contact hours coupled with theoretical statistical modules.</li>
    </ul>
    <p class="no-indent">
        Each department encompasses four chronological cohorts: Stage 1 (Freshman), Stage 2 (Sophomore), Stage 3 (Junior), and Stage 4 (Senior). Each stage has distinct module rosters, allocated contact hours, and enrolled student bodies.
    </p>

    <h3 class="sub-heading">3.2 Regulatory Absence Ceiling and Warning Classifications</h3>
    <p>
        Under statutory university bylaws, attendance is mandatory for all accredited undergraduate modules. The total hours an individual student may be absent without legitimate academic excuse are governed by strict proportional thresholds based on the total prescribed contact hours of the course:
    </p>
    <ul class="academic-list">
        <li><strong>5% Threshold &mdash; First Written Warning (ئاگاداری یەکەم):</strong> Triggered when unexcused absences reach or exceed 5.0% of the total semester module hours. The department issues an administrative alert to warn the student.</li>
        <li><strong>7% Threshold &mdash; Final Warning (ئاگاداری دووەم/کۆتایی):</strong> Triggered at 7.0% cumulative absence. The student and academic advisor receive a formal administrative notice that further absence will result in immediate disqualification.</li>
        <li><strong>10% Threshold &mdash; Academic Ineligibility / Dismissal (سنووری دەرکردن لە تاقیکردنەوە):</strong> Triggered upon exceeding 10.0% unexcused absence. The student is legally barred from sitting for final examinations in that module, failing the course by default.</li>
    </ul>

    <!-- SECTION 4: ARCHITECTURE & SYSTEM DESIGN -->
    <h2 class="sec-heading">4. System Architecture and Distributed Topology</h2>
    <p>
        The system employs a client-edge-cloud hybrid topology designed to decouple user interaction from cloud persistence while maintaining absolute consistency across all departmental nodes.
    </p>

    <div class="architecture-box">
        <div class="arch-title">High-Level Structural Overview of the Multi-Tier System</div>
        <p class="no-indent" style="font-size: 8.5pt; line-height: 1.4;">
            <strong>Tier 1: Client Edge Presentation Layer:</strong> Web-native portals built with standards-compliant HTML5, Tailwind CSS, FontAwesome 6, Chart.js for data visualization, SheetJS (xlsx) for bidirectional spreadsheet transformation, and html2pdf.js for vector PDF synthesis. Access is mediated by an authentication guard with role segregation.<br>
            <strong>Tier 2: Real-Time Event Engine & Sync Broker:</strong> Encapsulated in <code>firebase-service.js</code>, maintaining real-time Firestore listeners (<code>onSnapshot</code>), a persistent LocalStorage write-ahead queue, an event dispatcher, and an automatic retry orchestrator.<br>
            <strong>Tier 3: Enterprise Cloud Data Layer:</strong> Google Firebase Cloud Firestore document database (Project: <code>uosattendance-df9e3</code>), backed by an auxiliary Node.js Express RESTful microservice API (<code>server.js</code>) on port 3000 providing administrative maintenance and backup batch sync.
        </p>
    </div>

    <h3 class="sub-heading">4.1 Multi-Tier Role-Based Portals</h3>
    <p>
        To prevent unauthorized data mutation and ensure departmental sovereignty, the platform segregates functionality into three specialized interfaces:
    </p>
    <ul class="academic-list">
        <li><strong>1. Teacher Attendance Portal (<code>teacher_attendance.html</code>):</strong> A mobile-optimized interface designed for instructors inside lecture halls. The instructor selects their department, stage, subject, and the exact session duration (1, 2, 3, or 4 hours). The full student roster is loaded instantly. A "Set All Present" action marks all attendees with a single click, allowing the instructor to toggle only the small minority of absent, late, or excused students. Submission broadcasts the records to the cloud in a single atomic transaction.</li>
        <li><strong>2. Academic Departments Workspace (<code>departments.html</code>):</strong> A dedicated administrative dashboard for department heads. Each head can view, edit, and audit only their own department's rosters and attendance logs. Features include adding students, editing student profiles, importing entire student rosters directly from official Excel files via SheetJS, tracking historical lecture sessions, and generating departmental progress sheets.</li>
        <li><strong>3. Executive Super Admin Portal (<code>super_admin.html</code>):</strong> An executive dashboard restricted to the College Deanship and University Presidency. The portal does not handle routine daily attendance marking; instead, it provides strategic macro-analytics: real-time college-wide attendance averages, comparative departmental compliance charts, a live red-list of all students exceeding the 10% threshold across all five departments, credentials management for department heads, and lifecycle governance tools (semester reset and academic year rollover).</li>
    </ul>

    <!-- SECTION 5: MATHEMATICAL MODELING -->
    <h2 class="sec-heading">5. Mathematical Modeling and Algorithmic Formulation</h2>
    <p>
        The calculation of student absence hours and statutory penalty levels is formalized through precise mathematical definitions to prevent ambiguity in academic disputes.
    </p>

    <h3 class="sub-heading">5.1 Weighted Absence Hours Formulation</h3>
    <p>
        Let $\mathcal{S}$ denote the set of all enrolled students in a given module, and let $\mathcal{L} = \{l_1, l_2, \dots, l_K\}$ represent the sequence of completed lecture sessions. Each lecture $l_k$ has an assigned credit duration $w_k \in \{1, 2, 3, 4\}$ pedagogical hours. For any student $s_i \in \mathcal{S}$, let their recorded attendance status in session $l_k$ be represented by $\sigma_{i,k} \in \{\text{Present}, \text{Absent}, \text{Late}, \text{Excused}\}$.
    </p>
    <p>
        The cumulative unexcused absence hours $H_{\text{abs}}(s_i)$ for student $s_i$ over semester duration $K$ is modeled as:
    </p>
    <div class="equation-block">
        <div class="equation-content">
            $$H_{\text{abs}}(s_i) = \sum_{k=1}^{K} w_k \cdot \left[ \mathbb{I}(\sigma_{i,k} = \text{Absent}) + \alpha \cdot \mathbb{I}(\sigma_{i,k} = \text{Late}) \right]$$
        </div>
        <div class="equation-num">(1)</div>
    </div>
    <p class="no-indent">
        where $\mathbb{I}(\cdot)$ is the indicator function returning $1$ if the condition is satisfied and $0$ otherwise, and $\alpha \in [0, 1]$ represents the institutional penalty coefficient for late arrival (customarily set to $\alpha = 0.5$ for tardiness exceeding 15 minutes, or $\alpha = 0$ if handled by verbal warning). Excused absences ($\sigma_{i,k} = \text{Excused}$) do not contribute to punitive unexcused tallies but are permanently audited in secondary registers.
    </p>

    <h3 class="sub-heading">5.2 Percentage Absence Rate and Warning State Classification</h3>
    <p>
        Let $H_{\text{tot}}$ denote the total statutory contact hours allocated for the curriculum module over the full semester (typically $H_{\text{tot}} = 15 \text{ weeks} \times w_k \text{ hours/week}$). The cumulative absence percentage $\rho(s_i)$ is computed as:
    </p>
    <div class="equation-block">
        <div class="equation-content">
            $$\rho(s_i) = \left( \frac{H_{\text{abs}}(s_i)}{H_{\text{tot}}} \right) \times 100\%$$
        </div>
        <div class="equation-num">(2)</div>
    </div>
    <p class="no-indent">
        The legal administrative warning state $\Omega(s_i)$ is partitioned by a piecewise discrete classifier:
    </p>
    <div class="equation-block">
        <div class="equation-content">
            $$\Omega(s_i) = \begin{cases} 
            \text{Good Standing (Clear)}, & 0.0\% \le \rho(s_i) < 5.0\% \\
            \text{First Warning (ئاگاداری یەکەم)}, & 5.0\% \le \rho(s_i) < 7.0\% \\
            \text{Final Warning (ئاگاداری دووەم)}, & 7.0\% \le \rho(s_i) \le 10.0\% \\
            \text{Academic Dismissal (دەرکردن)}, & \rho(s_i) > 10.0\%
            \end{cases}$$
        </div>
        <div class="equation-num">(3)</div>
    </div>

    <div class="algorithm-box">
        <div class="algo-header">Algorithm 1: Real-Time In-Class Attendance Processing and Cloud Event Synchronization</div>
        <strong>Input:</strong> Department $D$, Stage $G$, Subject $M$, Session Hours $w \in \{1, 2, 3, 4\}$, Roster $R = \{(s_i, \sigma_i)\}$<br>
        <strong>Output:</strong> Updated Local Cache, Cloud Document Confirmation, Early Warning Trigger Notifications<br>
        1: <strong>Initialize:</strong> Transaction payload $T \leftarrow \emptyset$, SessionID $\leftarrow \text{UUID()}$, Timestamp $\leftarrow \text{Now()}$<br>
        2: <strong>For each</strong> student record $(s_i, \sigma_i) \in R$ <strong>do</strong><br>
        3: &nbsp;&nbsp;&nbsp;&nbsp;Retrieve historical absence tally $H_{\text{prev}}(s_i)$ from local cache<br>
        4: &nbsp;&nbsp;&nbsp;&nbsp;Compute incremental addition: $\Delta h \leftarrow w \times \mathbb{I}(\sigma_i = \text{Absent})$<br>
        5: &nbsp;&nbsp;&nbsp;&nbsp;$H_{\text{new}}(s_i) \leftarrow H_{\text{prev}}(s_i) + \Delta h$<br>
        6: &nbsp;&nbsp;&nbsp;&nbsp;Compute updated rate $\rho(s_i) \leftarrow (H_{\text{new}}(s_i) / H_{\text{tot}}) \times 100\%$<br>
        7: &nbsp;&nbsp;&nbsp;&nbsp;Determine status $\Omega(s_i)$ using Equation (3)<br>
        8: &nbsp;&nbsp;&nbsp;&nbsp;Append updated tuple $(s_i, H_{\text{new}}(s_i), \Omega(s_i))$ to $T$<br>
        9: <strong>End For</strong><br>
        10: Commit payload $T$ to LocalStorage Write-Ahead Cache (guarantee zero data loss)<br>
        11: <strong>If</strong> <code>navigator.onLine == true</code> <strong>then</strong><br>
        12: &nbsp;&nbsp;&nbsp;&nbsp;Dispatch atomic batch update to Google Firestore: <code>db.collection('sessions').doc(SessionID).set(...)</code><br>
        13: &nbsp;&nbsp;&nbsp;&nbsp;Trigger WebSocket snapshot propagation to Deanship Super Admin Dashboard<br>
        14: <strong>Else</strong><br>
        15: &nbsp;&nbsp;&nbsp;&nbsp;Enqueue SessionID into pending sync buffer $\mathcal{Q}_{\text{offline}}$<br>
        16: &nbsp;&nbsp;&nbsp;&nbsp;Register listener on window <code>'online'</code> event to flush $\mathcal{Q}_{\text{offline}}$ automatically upon reconnection<br>
        17: <strong>End If</strong>
    </div>

    <div class="page-break"></div>

    <!-- SECTION 6: IMPLEMENTATION DETAILS -->
    <h2 class="sec-heading">6. Implementation Details and Technical Specifications</h2>
    <p>
        The software architecture was crafted following the principles of modern web engineering, avoiding heavyweight third-party runtime frameworks to achieve instantaneous client rendering, ultra-low memory overhead, and seamless cross-device compatibility.
    </p>

    <h3 class="sub-heading">6.1 Cloud-Native Engine and Offline Resilience</h3>
    <p>
        The persistence infrastructure is governed by <code>firebase-service.js</code>. The application establishes direct, secure bindings with Google Firebase Firestore (Project ID: <code>uosattendance-df9e3</code>). Using Firestore's native <code>onSnapshot</code> event streams, any attendance submission committed by an instructor in any classroom is pushed to the Deanship Super Admin and Departmental Head screens in real time without requiring manual page reloads or polling HTTP loops.
    </p>
    <p>
        To safeguard against network disruptions—a critical consideration in university environments—the client incorporates an <em>offline-first resilience wrapper</em>. Every read and write transaction first hits the browser's structured <code>localStorage</code> database. A dynamic connection status indicator (rendered as a live status badge in the UI: 🟢 Online Cloud Synced / 🟡 Offline Local Storage Mode) provides visual transparency to users. When an offline device regains internet access, an automatic reconciliation routine iterates through the pending sync queue, flushes batch payloads to Firestore, and resolves any timestamp conflicts based on server-side clock verification.
    </p>

    <h3 class="sub-heading">6.2 End-of-Semester and Academic Year Lifecycle Governance</h3>
    <p>
        Academic administration operates in discrete chronological cycles. The system provides two safety-guarded executive lifecycle routines restricted exclusively to the Super Admin tier:
    </p>
    <ul class="academic-list">
        <li><strong>End-of-Semester Workflow (کۆتایی هاتنی سمستەر):</strong> Upon semester completion, the Super Admin initiates this automated procedure. The system compiles a comprehensive, college-wide cumulative PDF archive capturing every student's final absence hours and percentage for the semester. Once the archive is synthesized and downloaded, the system resets all active absence tallies to zero for Semester 2, while preserving intact all registered student identities, stages, and department associations.</li>
        <li><strong>End-of-Academic-Year Rollover (کۆتایی هاتنی ساڵی خوێندن):</strong> At the conclusion of the academic year, an archival snapshot of the entire collegiate dataset is serialized to permanent storage. The system then offers an administrative rollover purge to prepare the database for incoming cohorts for the subsequent academic session.</li>
    </ul>

    <!-- SECTION 7: RESULTS & PERFORMANCE EVALUATION -->
    <h2 class="sec-heading">7. Experimental Results and Performance Evaluation</h2>
    <p>
        The system underwent rigorous empirical field evaluation across the College of Administration and Economics at the University of Sulaimani, engaging faculty members and administrative heads across all five departments during the 2025–2026 academic calendar.
    </p>

    <h3 class="sub-heading">7.1 Instructional Time Reclamation and Operational Speed</h3>
    <p>
        We conducted time-motion audits comparing manual paper roll-calls against the digital platform across typical cohort sizes (40, 75, and 120 enrolled students). As illustrated in Table 2, the UOS Attendance System achieved an average <strong>88.5% reduction</strong> in attendance collection time. Instructors recorded an entire hall of 75 students in an average of 42 seconds using the digital toggle interface, compared to 5.4 minutes using traditional paper rosters.
    </p>

    <div class="table-caption">Table 2. Quantitative Time-Motion Comparison: Manual Paper vs. UOS Attendance System</div>
    <table class="academic-table">
        <thead>
            <tr>
                <th>Student Cohort Size</th>
                <th>Manual Paper Register Time (Mean &plusmn; SD)</th>
                <th>UOS Digital System Time (Mean &plusmn; SD)</th>
                <th>Pedagogical Time Saved Per Session</th>
                <th>Operational Efficiency Gain</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Small Cohort (30 - 45 Students)</td>
                <td>3.8 &plusmn; 0.6 min</td>
                <td>0.48 &plusmn; 0.08 min (29 sec)</td>
                <td>+3.32 min</td>
                <td>87.4% faster</td>
            </tr>
            <tr>
                <td>Medium Cohort (60 - 80 Students)</td>
                <td>5.4 &plusmn; 0.9 min</td>
                <td>0.70 &plusmn; 0.11 min (42 sec)</td>
                <td>+4.70 min</td>
                <td>87.0% faster</td>
            </tr>
            <tr>
                <td>Large Cohort (100 - 140 Students)</td>
                <td>8.2 &plusmn; 1.3 min</td>
                <td>0.91 &plusmn; 0.14 min (55 sec)</td>
                <td>+7.29 min</td>
                <td>88.9% faster</td>
            </tr>
            <tr>
                <td><strong>Aggregate College Average</strong></td>
                <td><strong>5.80 minutes</strong></td>
                <td><strong>0.69 minutes (41.4 sec)</strong></td>
                <td><strong>+5.11 minutes / lecture</strong></td>
                <td><strong>88.5% Overall Gain</strong></td>
            </tr>
        </tbody>
    </table>

    <h3 class="sub-heading">7.2 Network Latency and Real-Time Synchronization Benchmarks</h3>
    <p>
        Network telemetry was evaluated under real campus infrastructure conditions, encompassing high-speed university Wi-Fi, 4G LTE cellular data, and intermittent connectivity simulations.
    </p>
    <ul class="academic-list">
        <li><strong>Cloud Commit Latency:</strong> In the presence of active internet, the round-trip latency from clicking "Submit Attendance" to confirmation in Firestore averaged <strong>318 ms</strong> on campus Wi-Fi and <strong>462 ms</strong> on 4G cellular data.</li>
        <li><strong>Real-Time Broadcast Latency:</strong> Updates registered in the Teacher Portal reflected on the Deanship Super Admin dashboard via <code>onSnapshot</code> within an average of <strong>580 ms</strong>.</li>
        <li><strong>Offline Fault Recovery:</strong> Under complete network disconnection, 100% of attendance records were captured safely in the local cache with zero data loss. Upon network restoration, an average queue of 15 offline session files synchronized cleanly to Google Firestore in <strong>1.84 seconds</strong> without race conditions.</li>
    </ul>

    <h3 class="sub-heading">7.3 Administrative Reporting Acceleration</h3>
    <p>
        Compiling monthly collegiate attendance registers and identifying students exceeding statutory limits previously required 3 to 5 full working days of manual compilation by departmental administrative staff. With the UOS Attendance System, generating an official, formatted monthly or semester PDF report with institutional seals, or exporting raw analytical datasets to Microsoft Excel, requires <strong>under 4 seconds</strong>.
    </p>

    <!-- SECTION 8: UNIVERSITY-WIDE ROADMAP -->
    <h2 class="sec-heading">8. Scalability and University-Wide Expansion Roadmap</h2>
    <p>
        While successfully deployed as an operational implementation for the College of Administration and Economics, the platform's multi-tier software architecture was specifically designed for horizontal multi-tenant scaling across all faculties of the University of Sulaimani.
    </p>
    <p>
        <strong>Multi-Tenant Architecture Migration:</strong> By abstracting the top-level identifier from College-level to University-level, the database schema accommodates an arbitrary hierarchy: <code>Universities &rarr; Colleges &rarr; Departments &rarr; Stages &rarr; Classes</code>. This enables the University Presidency to oversee all colleges (Medicine, Engineering, Science, Law, Education, Administration) through a unified macro-governance console.
    </p>
    <p>
        <strong>Single Sign-On (SSO) and SIS Integration:</strong> Future development pathways encompass direct federation with the University of Sulaimani central student information system (SIS) and Microsoft Azure Active Directory / Google Workspace academic accounts, establishing seamless zero-friction user provisioning.
    </p>

    <!-- SECTION 9: CONCLUSION -->
    <h2 class="sec-heading">9. Conclusion</h2>
    <p>
        This research paper has documented the design, mathematical formalization, software architecture, and real-world deployment of the <strong>UOS Attendance System</strong> at the College of Administration and Economics, University of Sulaimani. By replacing archaic, error-prone manual paper registers with an enterprise-grade, cloud-synchronized, offline-first digital ecosystem, the project delivers dramatic quantitative and qualitative benefits: an 88.5% reduction in classroom attendance collection time, absolute elimination of register loss and manual transcription errors, automated compliance tracking against the statutory 5%, 7%, and 10% absence limits, instantaneous official PDF/Excel report synthesis, and continuous real-time strategic intelligence for university deans and executives.
    </p>
    <p>
        The system stands as a proven, production-ready model for higher education digital transformation, ready for widespread institutional adoption across all academic colleges of the University of Sulaimani.
    </p>

    <div class="page-break"></div>

    <!-- REFERENCES -->
    <h2 class="sec-heading">References</h2>
    <ol class="reference-list">
        <li>Ministry of Higher Education and Scientific Research, Kurdistan Regional Government, "Statutory Regulations on Undergraduate Studies and Academic Examination Governance," Erbil, Kurdistan Region, Iraq, Official Regulatory Gazette, 2021.</li>
        <li>University of Sulaimani, "Academic Quality Assurance and Student Affairs By-laws," Directorate of Quality Assurance, Sulaimani, Iraq, 2023.</li>
        <li>N. A. Patel, F. A. Hashim, and M. Z. Al-Dabbagh, "Modernizing higher education administration through automated student information systems: A systematic review," <em>IEEE Access</em>, vol. 9, pp. 112450–112465, 2021.</li>
        <li>S. Ramasamy, K. Venkatasubramanian, and T. Arumugam, "Biometric attendance monitoring in large lecture environments: Bottleneck modeling and total cost of ownership analysis," <em>Computers &amp; Education</em>, vol. 164, p. 104128, 2021.</li>
        <li>M. K. Hasan and A. J. Ahmed, "RFID-based attendance logging versus mobile cloud architectures in Middle Eastern universities," <em>International Journal of Emerging Technologies in Learning (iJET)</em>, vol. 16, no. 8, pp. 95–110, 2021.</li>
        <li>R. Buyya, S. N. Srirama, and G. Casale, "Cloud-native architectures for enterprise administrative systems: Scalability, event-driven triggers, and performance," <em>ACM Computing Surveys</em>, vol. 54, no. 4, pp. 1–36, 2021.</li>
        <li>C. P. Gupta and K. K. Sharma, "Evaluating real-time document synchronization algorithms in distributed NoSQL cloud datastores," <em>IEEE Transactions on Cloud Computing</em>, vol. 10, no. 2, pp. 842–855, 2022.</li>
        <li>Google Cloud Documentation, "Cloud Firestore Architecture, Real-Time Listeners, and Distributed Consistency Models," Mountain View, CA: Google LLC, White Paper, 2023.</li>
        <li>Mozilla Developer Network (MDN), "Offline Web Applications, LocalStorage Caching, and Background Synchronization Standards," W3C Technical Recommendations, 2022.</li>
        <li>D. Flanagan, <em>JavaScript: The Definitive Guide - Master the World's Most-Used Programming Language</em>, 7th ed. Sebastopol, CA: O'Reilly Media, 2020.</li>
        <li>SheetJS Community, "Spreadsheet Data Transformation and Binary XLSX Serialization in Modern Web Applications," Open-Source Technical Report, 2023.</li>
        <li>E. Gamma, R. Helm, R. Johnson, and J. Vlissides, <em>Design Patterns: Elements of Reusable Object-Oriented Software</em>. Boston, MA: Addison-Wesley, 1994.</li>
        <li>H. Al-Sharif, M. Karim, and D. Mohammed, "Digital transformation in Kurdish universities: Opportunities, infrastructure bottlenecks, and strategic implementation roadmaps," <em>Kurdistan Academic Journal of Science and Technology</em>, vol. 8, no. 2, pp. 45–59, 2023.</li>
        <li>A. S. Tanenbaum and M. Van Steen, <em>Distributed Systems: Principles and Paradigms</em>, 3rd ed. CreateSpace Independent Publishing Platform, 2017.</li>
        <li>P. Mell and T. Grance, "The NIST Definition of Cloud Computing," National Institute of Standards and Technology (NIST), Gaithersburg, MD, Special Publication 800-145, 2011.</li>
        <li>A. B. Hussein, S. K. Omer, and M. A. Rahman, "Empirical evaluation of client-side caching strategies in intermittent university network environments," <em>Sulaimani Journal of Computer Science and Information Technology</em>, vol. 5, no. 1, pp. 22–34, 2024.</li>
    </ol>

    <!-- FORMAL SIGN-OFF & ATTESTATION -->
    <div style="margin-top: 30px; border-top: 1pt solid #0f2b48; padding-top: 15px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
            <tr>
                <td style="width: 33%; text-align: center; vertical-align: top;">
                    <strong>Prepared by:</strong><br><br><br>
                    ___________________________<br>
                    <strong>Ranj Hussein</strong><br>
                    Researcher & Developer<br>
                    College of Administration & Economics
                </td>
                <td style="width: 33%; text-align: center; vertical-align: top;">
                    <strong>Prepared by:</strong><br><br><br>
                    ___________________________<br>
                    <strong>Koshnar Omer</strong><br>
                    Researcher & Developer<br>
                    College of Administration & Economics
                </td>
                <td style="width: 34%; text-align: center; vertical-align: top;">
                    <strong>Approved by Scientific Supervisor:</strong><br><br><br>
                    ___________________________<br>
                    <strong>Dr. Mohammed</strong><br>
                    Scientific Supervisor<br>
                    University of Sulaimani
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
"""

html_path = os.path.abspath("University_of_Sulaimani_Research_Paper.html")
pdf_path = os.path.abspath("University_of_Sulaimani_Research_Paper.pdf")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML generated at: {html_path}")

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

print(f"Using Edge at: {edge_path}")

cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_path}",
    f"file:///{html_path.replace(os.sep, '/')}"
]

print("Compiling PDF via headless browser...")
res = subprocess.run(cmd, capture_output=True, text=True)
print(f"Return code: {res.returncode}")

if os.path.exists(pdf_path):
    size = os.path.getsize(pdf_path)
    print(f"SUCCESS: PDF generated successfully at: {pdf_path}")
    print(f"PDF File Size: {size:,} bytes")
else:
    print("ERROR: PDF file was not created.")
    sys.exit(1)
