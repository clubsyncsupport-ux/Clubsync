import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & Terms of Use",
  description: "How ClubSync collects, uses, and protects information for students, teachers, and school clubs — and the rules for using it.",
};

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        .legal-doc {
          --legal-bg: #f7faf9;
          --legal-surface: #ffffff;
          --legal-surface-2: #eef4f2;
          --legal-border: #dbe6e1;
          --legal-text: #10201b;
          --legal-text-muted: #5c6f68;
          --legal-text-faint: #8a9891;
          --legal-accent: #0f9c85;
          --legal-accent-soft: #e3f7f2;
          --legal-warn: #a3690a;
          --legal-warn-soft: #fbf0dd;
          --legal-serif: "Fraunces", ui-serif, Georgia, serif;
          --legal-sans: "Public Sans", ui-sans-serif, -apple-system, "Segoe UI", sans-serif;
          --legal-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
        }
        .dark .legal-doc {
          --legal-bg: #0c1210;
          --legal-surface: #131b18;
          --legal-surface-2: #182220;
          --legal-border: #253029;
          --legal-text: #eef3f0;
          --legal-text-muted: #a2b3ac;
          --legal-text-faint: #6c7b75;
          --legal-accent: #4fd8bd;
          --legal-accent-soft: #12332c;
          --legal-warn: #e8b358;
          --legal-warn-soft: #2e2612;
        }
        .legal-doc {
          background: var(--legal-bg);
          color: var(--legal-text);
          font-family: var(--legal-sans);
          font-size: 15.5px;
          line-height: 1.65;
          min-height: 100vh;
        }
        .legal-doc a { color: var(--legal-accent); }
        .legal-shell {
          max-width: 1180px;
          margin: 0 auto;
          padding: 56px 24px 120px;
          display: grid;
          grid-template-columns: 220px minmax(0, 700px);
          gap: 64px;
          align-items: start;
        }
        @media (max-width: 880px) {
          .legal-shell { grid-template-columns: 1fr; gap: 32px; padding: 32px 20px 90px; }
          .legal-toc { position: static !important; }
        }
        .legal-masthead { grid-column: 1 / -1; margin-bottom: 8px; }
        .legal-eyebrow { font-family: var(--legal-mono); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--legal-accent); }
        .legal-masthead h1 { font-family: var(--legal-serif); font-weight: 600; font-size: 40px; letter-spacing: -0.01em; text-wrap: balance; margin: 8px 0 10px; }
        .legal-sub { color: var(--legal-text-muted); font-size: 15.5px; max-width: 62ch; margin: 0 0 14px; }
        .legal-meta { font-family: var(--legal-mono); font-size: 12.5px; color: var(--legal-text-faint); display: flex; gap: 18px; flex-wrap: wrap; }
        .legal-toc { position: sticky; top: 40px; font-size: 13px; }
        .legal-toc .group { margin-bottom: 22px; }
        .legal-toc .group-label { font-family: var(--legal-mono); font-size: 11px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--legal-text-faint); margin-bottom: 8px; }
        .legal-toc a { display: block; color: var(--legal-text-muted); text-decoration: none; padding: 4px 0 4px 10px; border-left: 2px solid transparent; margin-left: -1px; }
        .legal-toc a:hover { color: var(--legal-text); border-left-color: var(--legal-border); }
        .legal-callout { background: var(--legal-accent-soft); border: 1px solid var(--legal-accent); border-radius: 10px; padding: 18px 20px; margin-bottom: 40px; font-size: 14.5px; }
        .legal-callout p { margin: 0 0 8px; }
        .legal-callout p:last-child { margin-bottom: 0; }
        .legal-callout strong { color: var(--legal-text); }
        .legal-part { margin-bottom: 20px; }
        .legal-part-label { font-family: var(--legal-mono); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--legal-text-faint); border-bottom: 1px solid var(--legal-border); padding-bottom: 10px; margin: 64px 0 6px; }
        .legal-part-label.first { margin-top: 0; }
        .legal-part-title { font-family: var(--legal-serif); font-weight: 600; font-size: 27px; margin: 4px 0 28px; }
        .legal-clause { margin-bottom: 30px; scroll-margin-top: 28px; }
        .legal-clause h3 { font-family: var(--legal-serif); font-weight: 600; font-size: 18.5px; display: flex; gap: 10px; align-items: baseline; margin: 0 0 10px; }
        .legal-clause h3 .num { font-family: var(--legal-mono); font-size: 13px; color: var(--legal-accent); font-weight: 500; }
        .legal-clause p { margin: 0 0 12px; }
        .legal-clause ul, .legal-clause ol { margin: 0 0 12px; padding-left: 22px; }
        .legal-clause li { margin-bottom: 6px; }
        .legal-table-wrap { overflow-x: auto; margin: 14px 0; border: 1px solid var(--legal-border); border-radius: 8px; }
        .legal-table-wrap table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 480px; }
        .legal-table-wrap thead th { text-align: left; font-size: 11.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--legal-text-muted); background: var(--legal-surface-2); padding: 10px 14px; border-bottom: 1px solid var(--legal-border); }
        .legal-table-wrap tbody td { padding: 11px 14px; border-bottom: 1px solid var(--legal-border); vertical-align: top; }
        .legal-table-wrap tbody tr:last-child td { border-bottom: none; }
        .legal-note { background: var(--legal-warn-soft); border-left: 3px solid var(--legal-warn); border-radius: 6px; padding: 12px 16px; font-size: 14px; margin: 14px 0; }
        .legal-note strong { color: var(--legal-warn); }
        .legal-contact-card { background: var(--legal-surface-2); border: 1px solid var(--legal-border); border-radius: 10px; padding: 18px 20px; font-size: 14.5px; margin-top: 8px; }
        .legal-contact-card dt { font-family: var(--legal-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--legal-text-faint); margin-top: 10px; }
        .legal-contact-card dt:first-child { margin-top: 0; }
        .legal-contact-card dd { margin: 2px 0 0; }
        .legal-footer { margin-top: 64px; padding-top: 20px; border-top: 1px solid var(--legal-border); font-size: 12.5px; color: var(--legal-text-faint); }
      `}</style>
      <div className="legal-doc">
        <div className="legal-shell">
          <header className="legal-masthead">
            <p className="legal-eyebrow">ClubSync</p>
            <h1>Privacy Policy &amp; Terms of Use</h1>
            <p className="legal-sub">How ClubSync collects, uses, and protects information for students, teachers, and school clubs — and the rules for using it.</p>
            <div className="legal-meta">
              <span>Effective: August 26, 2026</span>
              <span>Version 1.0</span>
              <span>Applies to: clubsync.ca and all ClubSync services</span>
            </div>
          </header>

          <nav className="legal-toc">
            <div className="group">
              <p className="group-label">Privacy Policy</p>
              <a href="#p1">1. Who we are</a>
              <a href="#p2">2. Information we collect</a>
              <a href="#p3">3. Why we collect it</a>
              <a href="#p4">4. Your consent</a>
              <a href="#p5">5. Who can see it</a>
              <a href="#p6">6. Where it&rsquo;s stored</a>
              <a href="#p7">7. How it&rsquo;s protected</a>
              <a href="#p8">8. How long we keep it</a>
              <a href="#p9">9. Your rights</a>
              <a href="#p10">10. Google Sign-In</a>
              <a href="#p11">11. Children &amp; students</a>
              <a href="#p12">12. Built with AI assistance</a>
              <a href="#p13">13. Cookies</a>
              <a href="#p14">14. If something goes wrong</a>
              <a href="#p15">15. Changes to this policy</a>
            </div>
            <div className="group">
              <p className="group-label">Terms of Use</p>
              <a href="#t1">1. Accepting these terms</a>
              <a href="#t2">2. Who can use ClubSync</a>
              <a href="#t3">3. Your account</a>
              <a href="#t4">4. Acceptable use</a>
              <a href="#t5">5. Club &amp; content responsibility</a>
              <a href="#t6">6. Service hours &amp; records</a>
              <a href="#t7">7. Service availability</a>
              <a href="#t8">8. Suspension &amp; termination</a>
              <a href="#t9">9. Disclaimer &amp; liability</a>
              <a href="#t10">10. Governing law</a>
              <a href="#t11">11. Changes to these terms</a>
            </div>
            <div className="group">
              <p className="group-label">Contact</p>
              <a href="#contact">Get in touch</a>
            </div>
          </nav>

          <main>
            <div className="legal-callout">
              <p><strong>The short version:</strong> ClubSync stores the information needed to run your school&rsquo;s clubs — your name, email, grade, club memberships, and service hours — and nothing else. It&rsquo;s never sold, never shown to advertisers, and only seen by the people who need it to run your clubs (your club&rsquo;s teacher-supervisor and school admins). You can ask to see or delete your data at any time.</p>
              <p>The full detail below explains exactly what that means, because &ldquo;trust us&rdquo; isn&rsquo;t good enough on its own.</p>
            </div>

            <div className="legal-part">
              <p className="legal-part-label first">Part One</p>
              <h2 className="legal-part-title">Privacy Policy</h2>

              <section className="legal-clause" id="p1">
                <h3><span className="num">1</span>Who we are</h3>
                <p>ClubSync is a club, event, and volunteer-hour tracking platform built for students and staff at participating schools, starting with Hugh Boyd Secondary School. It is currently operated independently by its student developer, not by the school district itself, unless and until a school formally adopts it — see <a href="#p6">Section 6</a> for what changes if that happens.</p>
              </section>

              <section className="legal-clause" id="p2">
                <h3><span className="num">2</span>Information we collect</h3>
                <div className="legal-table-wrap">
                  <table>
                    <thead><tr><th>Category</th><th>What&rsquo;s included</th></tr></thead>
                    <tbody>
                      <tr><td>Account information</td><td>First and last name, email address, a securely hashed password (or a Google account link — see <a href="#p10">Section 10</a>), profile photo (optional)</td></tr>
                      <tr><td>School information</td><td>Your school, grade level, and whether you&rsquo;re a student or teacher</td></tr>
                      <tr><td>Club activity</td><td>Clubs you&rsquo;ve joined or created, your role in each (member, admin, or teacher/director), events you&rsquo;ve registered for or attended</td></tr>
                      <tr><td>Service hours</td><td>Hours logged through school events, plus any self-reported volunteer hours you submit, including your own description of the activity</td></tr>
                      <tr><td>Content you create</td><td>Club descriptions, announcements, and event details you post as a club director or officer</td></tr>
                      <tr><td>Basic technical data</td><td>Standard web server logs (IP address, browser type, access times) kept briefly for security and troubleshooting, not used to track you individually</td></tr>
                    </tbody>
                  </table>
                </div>
                <p>We do not collect payment information, government ID numbers, health information, or location data. We do not use tracking or advertising cookies of any kind — see <a href="#p13">Section 13</a>.</p>
              </section>

              <section className="legal-clause" id="p3">
                <h3><span className="num">3</span>Why we collect it</h3>
                <p>Every piece of information above exists for one reason: to run your school&rsquo;s clubs, events, and service-hour tracking. Specifically, we use it to:</p>
                <ul>
                  <li>Let you sign in and keep your account secure</li>
                  <li>Show you the clubs and events relevant to your school and grade</li>
                  <li>Let club teachers and admins manage membership, attendance, and events</li>
                  <li>Track and verify volunteer/service hours</li>
                  <li>Contact you about your account or activity within the app (never marketing, and never to a third party)</li>
                </ul>
                <p>We do not use your information for advertising, and we do not sell, rent, or trade it to anyone, for any reason.</p>
              </section>

              <section className="legal-clause" id="p4">
                <h3><span className="num">4</span>Your consent</h3>
                <p>By creating an account, you&rsquo;re agreeing to let ClubSync collect and use your information as described in this policy, for the purposes described in <a href="#p3">Section 3</a> — this is how British Columbia&rsquo;s private-sector privacy law (PIPA) expects consent to work: specific, and limited to what you were actually told.</p>
                <p>If you&rsquo;re old enough to sign yourself up for a school club without a parent present, we treat that as old enough to understand and agree to this policy. If you&rsquo;re younger, or your school requires it, we ask that a parent or guardian review this page with you before you sign up.</p>
              </section>

              <section className="legal-clause" id="p5">
                <h3><span className="num">5</span>Who can see your information</h3>
                <div className="legal-table-wrap">
                  <table>
                    <thead><tr><th>Who</th><th>What they can see</th></tr></thead>
                    <tbody>
                      <tr><td>You</td><td>Everything in your own account</td></tr>
                      <tr><td>A club&rsquo;s teacher/director and admins</td><td>The membership list, attendance, and service hours for <em>that specific club only</em> — never your activity in other clubs</td></tr>
                      <tr><td>School admins</td><td>Students and clubs at their own school only, for account and dispute support</td></tr>
                      <tr><td>The platform administrator</td><td>Full access, for maintaining the service and responding to support requests or policy violations — see <a href="#contact">Contact</a> for who this is today</td></tr>
                    </tbody>
                  </table>
                </div>
                <p>We never share your information with anyone outside of ClubSync — no advertisers, no data brokers, no other companies — except where required by law.</p>
              </section>

              <section className="legal-clause" id="p6">
                <h3><span className="num">6</span>Where your information is stored</h3>
                <p>ClubSync&rsquo;s website is hosted with Vercel, and its database is hosted with Supabase, in Supabase&rsquo;s Canada (Central) data centre. Your information is encrypted in transit (HTTPS) and the database itself is not publicly accessible. Password-reset emails are sent through Resend, a transactional email provider — it only ever sees the one-time reset link and your email address for that single message, never your broader account data.</p>
                <div className="legal-note">
                  <strong>If your school formally adopts ClubSync</strong> as an official tool (rather than the current independent, student-run pilot), British Columbia&rsquo;s public-sector privacy law (FIPPA) still expects a Privacy Impact Assessment as part of that formal adoption process — that process would happen as part of the school taking ClubSync on, not something silently skipped, even though ClubSync&rsquo;s data already resides in Canada.
                </div>
              </section>

              <section className="legal-clause" id="p7">
                <h3><span className="num">7</span>How your information is protected</h3>
                <ul>
                  <li>Passwords are never stored in plain text — they&rsquo;re one-way hashed using industry-standard bcrypt, so even we can&rsquo;t see your actual password</li>
                  <li>All traffic between your device and ClubSync is encrypted (HTTPS)</li>
                  <li>Access to club and student data is restricted by role — a club officer can&rsquo;t see another club&rsquo;s data, and a student can&rsquo;t see another student&rsquo;s private records</li>
                  <li>Every sensitive administrative action (suspending an account, merging accounts, editing service hours) is logged with who did it and when</li>
                </ul>
              </section>

              <section className="legal-clause" id="p8">
                <h3><span className="num">8</span>How long we keep your information</h3>
                <p>We keep your account and activity data for as long as your account is active. You can delete your account and personal information yourself at any time from Settings, and it&rsquo;s removed right away — except where a record needs to be kept for legitimate club/school record-keeping (for example, a school may need to retain verified service-hour totals as part of its own graduation records — that&rsquo;s the school&rsquo;s retention obligation, not ClubSync&rsquo;s).</p>
                <p>Graduating or leaving the school doesn&rsquo;t delete your account automatically today — that only happens when you (or a parent/guardian, for a minor) actually request it, the same as any other deletion request in <a href="#p9">Section 9</a>. Automatically archiving a graduated student&rsquo;s account is on our roadmap; until it ships, this policy describes what actually happens, not what&rsquo;s planned.</p>
              </section>

              <section className="legal-clause" id="p9">
                <h3><span className="num">9</span>Your rights</h3>
                <p>You can, at any time:</p>
                <ul>
                  <li><strong>Access</strong> — see everything ClubSync has stored about you (most of it is already visible in your own account)</li>
                  <li><strong>Correct</strong> — fix inaccurate information</li>
                  <li><strong>Delete</strong> — request your account and personal information be removed</li>
                  <li><strong>Ask questions</strong> — find out exactly how a specific piece of your information is being used</li>
                </ul>
                <p>To exercise any of these, contact us using the details in <a href="#contact">Contact</a>. We&rsquo;ll respond within a reasonable time, consistent with what BC&rsquo;s privacy law (PIPA) expects of organizations handling personal information.</p>
              </section>

              <section className="legal-clause" id="p10">
                <h3><span className="num">10</span>Signing in with Google</h3>
                <p>If you choose &ldquo;Continue with Google&rdquo; instead of a password, Google shares your name, email address, and profile photo with ClubSync — nothing else. We never see or store your Google password. You can disconnect ClubSync from your Google account at any time from your Google Account settings, independently of ClubSync.</p>
              </section>

              <section className="legal-clause" id="p11">
                <h3><span className="num">11</span>Children and students</h3>
                <p>ClubSync is built for a school environment where most users are minors. We collect the minimum information needed to run school clubs, we never use it for advertising, and we never share it outside the small set of people described in <a href="#p5">Section 5</a>. If you are a parent or guardian and want to review, correct, or delete your child&rsquo;s information, contact us — we&rsquo;ll work directly with you, no separate account needed.</p>
              </section>

              <section className="legal-clause" id="p12">
                <h3><span className="num">12</span>Built with AI assistance</h3>
                <p>In the interest of being upfront about it: ClubSync&rsquo;s code was written with the help of AI-assisted development tools (Claude Code, by Anthropic). No part of your personal information is used to train any AI model — the AI was a tool used during development, the same way a code editor or a spell-checker is a tool. It does not run inside the live app, does not read your data, and is not involved in any decision the app makes about your account.</p>
                <p>Responsibility for how ClubSync actually behaves — what it collects, how it&rsquo;s protected, and how it&rsquo;s used — rests with its developer, not with any AI tool that helped write it. Using AI during development doesn&rsquo;t change that.</p>
              </section>

              <section className="legal-clause" id="p13">
                <h3><span className="num">13</span>Cookies</h3>
                <p>ClubSync uses one small, secure cookie to keep you signed in. That&rsquo;s it — no advertising cookies, no third-party tracking scripts, no analytics that follow you around the web. The sign-in cookie is deleted when you sign out.</p>
              </section>

              <section className="legal-clause" id="p14">
                <h3><span className="num">14</span>If something goes wrong</h3>
                <p>If we discover a privacy or security incident affecting your information, we&rsquo;ll act on it without delay: contain and assess it as soon as we&rsquo;re aware, notify anyone affected (and their school, where applicable) as soon as reasonably possible once we understand what happened, and tell you plainly what occurred, what information was involved, and what we&rsquo;re doing about it. This isn&rsquo;t a hypothetical policy — it&rsquo;s the actual process we&rsquo;d follow, and it applies whether the incident is large or small.</p>
              </section>

              <section className="legal-clause" id="p15">
                <h3><span className="num">15</span>Changes to this policy</h3>
                <p>If this policy changes in a meaningful way, we&rsquo;ll update the &ldquo;Effective&rdquo; date at the top of this page and, for significant changes, notify users directly within the app.</p>
              </section>
            </div>

            <div className="legal-part">
              <p className="legal-part-label">Part Two</p>
              <h2 className="legal-part-title">Terms of Use</h2>

              <section className="legal-clause" id="t1">
                <h3><span className="num">1</span>Accepting these terms</h3>
                <p>By creating a ClubSync account, you agree to these Terms of Use and the Privacy Policy above. If you don&rsquo;t agree, don&rsquo;t create an account.</p>
              </section>

              <section className="legal-clause" id="t2">
                <h3><span className="num">2</span>Who can use ClubSync</h3>
                <p>ClubSync is intended for students, teachers, and staff at participating schools. One account per person — accounts are not transferable, and you shouldn&rsquo;t create an account on someone else&rsquo;s behalf.</p>
              </section>

              <section className="legal-clause" id="t3">
                <h3><span className="num">3</span>Your account</h3>
                <ul>
                  <li>Keep your login information accurate and your password private</li>
                  <li>You&rsquo;re responsible for activity that happens under your account</li>
                  <li>Tell us right away if you think someone else has accessed your account</li>
                </ul>
              </section>

              <section className="legal-clause" id="t4">
                <h3><span className="num">4</span>Acceptable use</h3>
                <p>Don&rsquo;t use ClubSync to:</p>
                <ul>
                  <li>Harass, impersonate, or misrepresent yourself or anyone else</li>
                  <li>Create a fake club, event, or account</li>
                  <li>Try to access another person&rsquo;s account or data without permission</li>
                  <li>Misuse admin, officer, or director permissions — for example, approving your own self-reported hours, or removing another member without a legitimate reason</li>
                  <li>Post anything abusive, hateful, or otherwise inappropriate for a school setting</li>
                </ul>
                <p>Club teachers, school admins, and the platform administrator can remove content or suspend accounts that break these rules — see <a href="#t8">Section 8</a>.</p>
              </section>

              <section className="legal-clause" id="t5">
                <h3><span className="num">5</span>Club and content responsibility</h3>
                <p>If you&rsquo;re a club director, officer, or admin, you&rsquo;re responsible for what you post on behalf of your club — descriptions, announcements, and event details. ClubSync doesn&rsquo;t review content before it&rsquo;s posted; it can be removed after the fact if it violates these terms.</p>
                <p>If you upload a photo or video, only do so with the parent or guardian permission your school requires for that student, and avoid images that include a student&rsquo;s full name, address, or phone number.</p>
              </section>

              <section className="legal-clause" id="t6">
                <h3><span className="num">6</span>Service hours and records</h3>
                <p>ClubSync is a record-keeping tool, not the final authority on your school&rsquo;s service-hour requirements. Self-reported hours are logged on an honor system; verified hours require confirmation from a club teacher, director, or admin. Whether hours logged in ClubSync count toward your school&rsquo;s official graduation or program requirements is entirely up to your school&rsquo;s own policies — ClubSync doesn&rsquo;t control or guarantee that.</p>
              </section>

              <section className="legal-clause" id="t7">
                <h3><span className="num">7</span>Service availability</h3>
                <p>ClubSync is currently a student-built, independently-run pilot service, not an enterprise product with a guaranteed uptime commitment. We do our best to keep it reliable, but the service is provided on an &ldquo;as available&rdquo; basis, and we&rsquo;re not responsible for lost access to data during outages — see <a href="#p8">Section 8 of the Privacy Policy</a> on how long records are actually kept regardless of short-term downtime.</p>
              </section>

              <section className="legal-clause" id="t8">
                <h3><span className="num">8</span>Suspension and termination</h3>
                <p>An account that violates these terms can be suspended or removed by a club teacher/director (within their own club), a school admin (within their own school), or the platform administrator (anywhere). You can also delete your own account at any time by contacting us.</p>
              </section>

              <section className="legal-clause" id="t9">
                <h3><span className="num">9</span>Disclaimer and limitation of liability</h3>
                <p>ClubSync is provided &ldquo;as is,&rdquo; without warranties of any kind. To the fullest extent allowed by law, ClubSync and its developer are not liable for indirect, incidental, or consequential damages arising from your use of the service — including lost data, missed events, or disputes over service-hour credit. Nothing in this section limits any liability that cannot legally be limited under British Columbia or Canadian law.</p>
              </section>

              <section className="legal-clause" id="t10">
                <h3><span className="num">10</span>Governing law</h3>
                <p>These terms are governed by the laws of the Province of British Columbia and the federal laws of Canada applicable within it.</p>
              </section>

              <section className="legal-clause" id="t11">
                <h3><span className="num">11</span>Changes to these terms</h3>
                <p>We may update these terms as ClubSync grows. Material changes will be flagged in the app, and continuing to use ClubSync after a change means you accept the updated terms.</p>
              </section>
            </div>

            <section className="legal-clause" id="contact" style={{ marginTop: 56 }}>
              <h3 style={{ fontFamily: "var(--legal-serif)", fontSize: 20 }}>Contact</h3>
              <p>Questions about this policy, or want to access, correct, or delete your information? Reach out directly:</p>
              <div className="legal-contact-card">
                <dl>
                  <dt>Privacy &amp; general contact</dt>
                  <dd>clubsyncsupport@gmail.com</dd>
                  <dt>Response time</dt>
                  <dd>We aim to respond within a few business days</dd>
                </dl>
              </div>
            </section>

            <footer className="legal-footer">
              This document was drafted with the help of AI-assisted research into British Columbia&rsquo;s privacy laws (PIPA, FIPPA) and common practices at comparable services, as a strong starting point — not a substitute for review by the school or a lawyer before wide release.
            </footer>
          </main>
        </div>
      </div>
    </>
  );
}
