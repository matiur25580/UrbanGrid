import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Activity, ArrowDownRight, ArrowUpRight, Building2, ChevronDown,
  CircleAlert, LogOut, MapPin, MapPinned, RefreshCw,
  Search, ShieldCheck, SlidersHorizontal, X
} from "lucide-react";
import { assetsApi, authApi, type AssetFeature, type Session } from "./lib/api";

type AuthMode = "login" | "register";
type Filters = { status: string; criticality: string };

const initialFilters: Filters = { status: "", criticality: "" };
function AuthScreen({ onSession }: { onSession: (session: Session) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const session = mode === "login"
        ? await authApi.login(email, password, organizationSlug)
        : await authApi.register({ name, email, password, organizationName, organizationSlug });
      onSession(session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to authenticate.");
    } finally {
      setBusy(false);
    }
  };

  const updateOrganization = (value: string) => {
    setOrganizationName(value);
    setOrganizationSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48));
  };

  return (
    <main className="auth-shell">
      <div className="auth-art">
        <div className="auth-brand"><span className="brand-mark">U</span> UrbanGrid</div>
        <div className="auth-art-copy">
          <span className="eyebrow"><i /> INFRASTRUCTURE INTELLIGENCE PLATFORM</span>
          <h1>See the city.<br /><em>Understand the system.</em></h1>
          <p>One secure workspace for infrastructure assets, field operations, and accountable decisions.</p>
          <div className="auth-art-stats"><span><b>01</b> TENANT-ISOLATED</span><span><b>02</b> GEO-ENABLED</span><span><b>03</b> AUDIT-READY</span></div>
        </div>
        <div className="auth-grid-art" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
      </div>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <span className="kicker">WORKSPACE ACCESS</span>
          <h2>{mode === "login" ? "Welcome back." : "Create your workspace."}</h2>
          <p className="auth-subtitle">{mode === "login" ? "Sign in to continue to your operations workspace." : "Start with an organization owner account."}</p>
          <div className="auth-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && <label>Full name<input autoComplete="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Alex Morgan" /></label>}
            <label>Work email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@organization.com" /></label>
            <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={12} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 12 characters" /></label>
            {mode === "register" && <label>Organization name<input required value={organizationName} onChange={e => updateOrganization(e.target.value)} placeholder="North City Works" /></label>}
            <label>Organization slug<input required value={organizationSlug} onChange={e => setOrganizationSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48))} placeholder="north-city-works" /></label>
            {error && <div className="auth-error"><CircleAlert size={16} /> {error}</div>}
            <button className="primary-button" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in to workspace" : "Create secure workspace"} <ArrowUpRight size={17} /></button>
          </form>
          <div className="auth-security"><ShieldCheck size={16} /><span>Protected by organization-scoped access controls and secure refresh sessions.</span></div>
        </div>
      </section>
    </main>
  );
}

function AssetMap({ features, selected, onSelect, onBoundsChange }: {
  features: AssetFeature[];
  selected: string | null;
  onSelect: (feature: AssetFeature) => void;
  onBoundsChange: (bbox: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, preferCanvas: true, maxBounds: L.latLngBounds([-85, -180], [85, 180]), maxBoundsViscosity: 1 }).setView([22.8, 82.5], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateBounds = () => {
      const bounds = map.getBounds();
      const bbox = [
        Math.max(-180, bounds.getWest()),
        Math.max(-85, bounds.getSouth()),
        Math.min(180, bounds.getEast()),
        Math.min(85, bounds.getNorth())
      ].map(value => value.toFixed(5)).join(",");
      onBoundsChange(bbox);
    };
    map.on("moveend", updateBounds);
    updateBounds();
    return () => { map.off("moveend", updateBounds); };
  }, [onBoundsChange]);

  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    features.forEach(feature => {
      const [longitude, latitude] = feature.geometry.coordinates;
      const active = selected === feature.id;
      const criticality = feature.properties.criticality;
      const color = criticality === "critical" ? "#ef927d" : criticality === "high" ? "#e9bd70" : "#52cfa6";
      const marker = L.circleMarker([latitude, longitude], {
        radius: active ? 10 : 7,
        color: active ? "#fff0d0" : color,
        weight: active ? 3 : 1.5,
        fillColor: color,
        fillOpacity: 0.9
      });
      marker.on("click", () => onSelect(feature));
      marker.addTo(layer);
    });
  }, [features, selected, onSelect]);

  return (
    <div className="map-canvas">
      <div className="map-label"><span className="live-dot" /> ASSET DISTRIBUTION <small>WGS84 · LIVE ORGANIZATION DATA</small></div>
      <div className="leaflet-map" ref={containerRef} role="application" aria-label="Interactive infrastructure asset map" />
      <div className="map-scale">SELECT A MARKER TO INSPECT AN ASSET</div>
      <div className="map-attribution">MAP DATA © OPENSTREETMAP CONTRIBUTORS</div>
    </div>
  );
}

function Dashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [features, setFeatures] = useState<AssetFeature[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [bbox, setBbox] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadAssets = useCallback(async (signal?: AbortSignal) => {
    if (!bbox) return;
    setLoading(true);
    setError("");
    try {
      const collection = await assetsApi.map(session.accessToken, filters, bbox, signal);
      setFeatures(collection.features || []);
      setSelected(current => collection.features.some(feature => feature.id === current) ? current : null);
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : "Unable to load geospatial assets.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [session.accessToken, filters, bbox]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAssets(controller.signal);
    return () => controller.abort();
  }, [loadAssets]);

  const visibleFeatures = useMemo(() => features.filter(feature => {
    const term = search.trim().toLowerCase();
    return !term || feature.properties.name.toLowerCase().includes(term) || feature.properties.assetCode.toLowerCase().includes(term);
  }), [features, search]);
  const selectedFeature = features.find(feature => feature.id === selected) || null;
  const handleBoundsChange = useCallback((nextBounds: string) => setBbox(nextBounds), []);
  const criticalCount = features.filter(feature => feature.properties.criticality === "critical").length;
  const maintenanceCount = features.filter(feature => feature.properties.status === "under_maintenance").length;

  return (
    <main className="workspace">
      <header className="workspace-header">
        <a className="brand" href="/"><span className="brand-mark">U</span> UrbanGrid</a>
        <div className="workspace-breadcrumb"><span>OPERATIONS</span><b>/</b> GEO INTELLIGENCE</div>
        <div className="workspace-user"><span className="user-avatar">{session.user.name.slice(0, 1).toUpperCase()}</span><div><b>{session.user.name}</b><small>{session.organization.name}</small></div><button title="Sign out" onClick={onLogout}><LogOut size={17} /></button></div>
      </header>
      <section className="workspace-content">
        <div className="page-heading"><div><span className="kicker">SPATIAL OPERATIONS / 05</span><h1>Geospatial intelligence</h1><p>Discover, inspect, and understand your infrastructure footprint.</p></div><button className="outline-button" onClick={() => void loadAssets()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh data</button></div>
        <div className="metric-row">
          <article><span>VISIBLE ASSETS</span><b>{features.length.toLocaleString()}</b><small><MapPin size={13} /> Geospatial records</small></article>
          <article><span>CRITICAL ASSETS</span><b>{criticalCount.toLocaleString()}</b><small><CircleAlert size={13} /> Require priority attention</small></article>
          <article><span>IN MAINTENANCE</span><b>{maintenanceCount.toLocaleString()}</b><small><Activity size={13} /> Active maintenance state</small></article>
          <article><span>DATA SCOPE</span><b>ORG</b><small><ShieldCheck size={13} /> Tenant isolated</small></article>
        </div>
        <section className="map-workspace">
          <div className="map-toolbar"><div className="map-title"><MapPinned size={19} /><div><b>Infrastructure map</b><small>Spatial asset explorer</small></div></div><div className="map-filters"><label className="search-box"><Search size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…" /></label><label className="filter-select"><SlidersHorizontal size={14} /><select value={filters.status} onChange={e => setFilters(current => ({ ...current, status: e.target.value }))}><option value="">All statuses</option><option value="active">Active</option><option value="under_maintenance">In maintenance</option><option value="decommissioned">Decommissioned</option><option value="retired">Retired</option></select><ChevronDown size={13} /></label><label className="filter-select"><select value={filters.criticality} onChange={e => setFilters(current => ({ ...current, criticality: e.target.value }))}><option value="">All criticality</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><ChevronDown size={13} /></label></div></div>
          {error && <div className="map-error"><CircleAlert size={16} /><span>{error}</span><button onClick={() => void loadAssets()}>Try again</button></div>}
          <div className="map-body"><div className="map-main"><AssetMap features={visibleFeatures} selected={selected} onSelect={feature => setSelected(feature.id)} onBoundsChange={handleBoundsChange} />{loading && <div className="map-loading"><RefreshCw size={17} className="spin" /> Loading organization assets…</div>}<div className="map-legend"><span><i className="legend-dot critical" /> Critical</span><span><i className="legend-dot high" /> High</span><span><i className="legend-dot normal" /> Standard</span></div></div>
            <aside className="asset-sidebar"><div className="sidebar-heading"><div><span className="kicker">ASSET REGISTER</span><h3>Asset details</h3></div><span className="result-count">{visibleFeatures.length} RESULTS</span></div>
              {selectedFeature ? <div className="selected-asset"><div className="asset-icon"><Building2 size={19} /></div><span className="asset-code">{selectedFeature.properties.assetCode}</span><h4>{selectedFeature.properties.name}</h4><div className="asset-tags"><span>{selectedFeature.properties.status.replaceAll("_", " ")}</span><span className={`severity ${selectedFeature.properties.criticality}`}>{selectedFeature.properties.criticality}</span></div><div className="asset-coordinate"><span>LONGITUDE</span><b>{selectedFeature.geometry.coordinates[0].toFixed(5)}</b><span>LATITUDE</span><b>{selectedFeature.geometry.coordinates[1].toFixed(5)}</b></div><button className="clear-selection" onClick={() => setSelected(null)}>Clear selection <X size={13} /></button></div> : <div className="asset-list">{visibleFeatures.slice(0, 30).map(feature => <button className="asset-list-item" key={feature.id} onClick={() => setSelected(feature.id)}><span className="asset-list-icon"><Building2 size={15} /></span><span><b>{feature.properties.name}</b><small>{feature.properties.assetCode}</small></span><ArrowDownRight size={15} /></button>)}{visibleFeatures.length === 0 && !loading && <div className="empty-state"><MapPin size={21} /><b>No matching assets</b><span>Try adjusting your filters or search.</span></div>}</div>}
              <div className="sidebar-foot"><ShieldCheck size={14} /> Organization-scoped results</div>
            </aside>
          </div>
        </section>
        <footer className="workspace-footer"><span>URBANGRID / GEO INTELLIGENCE</span><span>WGS84 COORDINATE SYSTEM · DATA FROM YOUR ORGANIZATION</span></footer>
      </section>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    authApi.refresh().then(value => { if (active) setSession(value); }).catch(() => {
      if (active) setSession(null);
    }).finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);

  const logout = async () => {
    try { await authApi.logout(); } finally { setSession(null); }
  };

  if (restoring) return <div className="app-loading"><span className="brand-mark">U</span><b>UrbanGrid</b><span>Restoring secure workspace…</span></div>;
  return session ? <Dashboard session={session} onLogout={() => void logout()} /> : <AuthScreen onSession={setSession} />;
}
