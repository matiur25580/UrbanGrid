import { Activity, Building2, ClipboardList, MapPinned, ShieldCheck, Wrench } from "lucide-react";

const capabilities = [
  { icon: Building2, title: "Infrastructure registry", detail: "A unified record for every public asset, its ownership, condition, and lifecycle." },
  { icon: MapPinned, title: "Geospatial intelligence", detail: "Connect operational records to real places, geographic layers, and service areas." },
  { icon: Wrench, title: "Maintenance operations", detail: "Coordinate preventive plans, corrective work orders, field execution, and approvals." },
  { icon: ClipboardList, title: "Inspections & evidence", detail: "Capture structured inspections, defects, photos, and accountable sign-offs." },
  { icon: Activity, title: "Live operational signals", detail: "Turn telemetry and field reports into actionable alerts and incident workflows." },
  { icon: ShieldCheck, title: "Enterprise governance", detail: "Build around tenant boundaries, least privilege, auditability, and secure defaults." }
];

export default function App() {
  return (
    <main className="shell">
      <nav className="topbar">
        <a className="brand" href="/" aria-label="UrbanGrid home"><span className="brand-mark">U</span> UrbanGrid</a>
        <span className="environment"><i /> FOUNDATION PREVIEW</span>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span /> SMART INFRASTRUCTURE OPERATIONS</div>
        <h1>Infrastructure deserves<br /><em>intelligent operations.</em></h1>
        <p className="intro">One connected workspace to understand infrastructure assets, coordinate maintenance, and make better operational decisions.</p>
        <div className="hero-meta"><span>01 / PLATFORM FOUNDATION</span><span>BUILT FOR ACCOUNTABILITY</span></div>
      </section>

      <section className="section-heading">
        <div><span className="kicker">THE PLATFORM</span><h2>Designed around the work that matters.</h2></div>
        <p>UrbanGrid is being developed in milestones. These are the product domains the foundation will support.</p>
      </section>

      <section className="capability-grid">
        {capabilities.map(({ icon: Icon, title, detail }, index) => (
          <article className="capability" key={title}>
            <div className="capability-top"><span>0{index + 1}</span><Icon size={21} strokeWidth={1.7} /></div>
            <h3>{title}</h3><p>{detail}</p>
          </article>
        ))}
      </section>

      <footer><span>URBANGRID / ENGINEERING FOUNDATION</span><span>RELIABLE SYSTEMS. ACCOUNTABLE OPERATIONS.</span></footer>
    </main>
  );
}
