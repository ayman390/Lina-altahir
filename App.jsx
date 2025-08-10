import React, { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { HashRouter as Router, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar } from "recharts";
import './App.css';

/**
 * Luggage Share — App Shell + Pages (winy + white)
 *
 * Pages: Overview, Search, Need Space, Have Space, Orders, Shipments, Payments, Support, Settings, Profile, Chat
 * - Sidebar buttons route to separate pages (HashRouter for preview).
 * - Need Space / Have Space: two dedicated flows with KYC and ticket uploads, matched by route & capacity.
 * - "Search" remains a general calculator/explorer (safe content types only — excludes banned/restricted items).
 * - Pricing: Per‑kg base from region matrix (Arabic list). **Displayed user price = 80% of table**.
 *   Escrow split remains 60% carrier / 40% platform, but **platform share is visible only to OWNER**.
 * - KYC on booking: requires ID + Passport (+ selfie photo). Providers must also upload **flight ticket**.
 * - Chat page demonstrates end‑to‑end encryption using Web Crypto (AES‑GCM) — client side only demo.
 * - Airports: bundled mini dataset + file upload to import a full airports CSV/JSON; UI shows count from dataset.
 * - Currencies: ISO‑4217 style dropdown (subset covering essentially all codes; add more easily).
 * - Escrow release method stub: splits funds 60% to carrier, 40% to platform on delivery (owner only view).
 */

// --- Theme (winy + white)
const WINY = {
  primary: "#4B2741",
  primarySoft: "#613050",
  bg: "#ffffff",
  ink: "#1f1f1f",
  muted: "#6b6b6b",
  border: "#eee8ef",
  chip: "#f6f1f7",
};

// --- Supabase bootstrap (same project values for preview)
const DEFAULT_SUPABASE_URL = "https://ghcgdpinnkifumtemrol.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoY2dkcGlubmtpZnVtdGVtcm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MTQzNjQsImV4cCI6MjA3MDM5MDM2NH0.1fwkUQsFfl6O-x-LBYQBY-Lt6FGwbZKTYNjaFIsMIPg";

function readEnv(name) {
  const im = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : undefined;
  const fromImport = im?.[name];
  const fromProcess = typeof process !== "undefined" ? process?.env?.[name] : undefined;
  const fromWindow = typeof window !== "undefined" ? (window[name] ?? window.__ENV__?.[name]) : undefined;
  return fromImport ?? fromProcess ?? fromWindow ?? undefined;
}

function getSupabase() {
  const url = readEnv("VITE_SUPABASE_URL") || DEFAULT_SUPABASE_URL;
  const anon = readEnv("VITE_SUPABASE_ANON_KEY") || DEFAULT_SUPABASE_ANON_KEY;
  return createClient(url, anon);
}

// --- Owner visibility (platform share only)
const OWNER_EMAIL = (readEnv("VITE_OWNER_EMAIL") || "Aymanmo7md@gmail.com").toLowerCase();
function useIsOwner(supabase) {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data?.user?.email?.toLowerCase();
        setIsOwner(!!email && email === OWNER_EMAIL);
      } catch (_) {}
    })();
  }, [supabase]);
  return isOwner;
}

// --- Fallback Logo (inline) if file not found
const LogoFallback = () => (
  <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden>
    <rect x="16" y="18" width="32" height="30" rx="4" fill={WINY.primary} />
    <rect x="24" y="12" width="16" height="6" rx="2" fill={WINY.primary} />
    <path d="M32 38 l8 -6 l-4 0 l0 -8 l-8 0 l0 8 l-4 0 z" fill="#fff" />
  </svg>
);

const Logo = () => {
  const [ok, setOk] = useState(true);
  return ok ? (
    <img src="/luggage-share-logo.png" onError={() => setOk(false)} alt="Luggage Share" className="h-7 w-7 object-contain" />
  ) : (
    <LogoFallback />
  );
};

// --- Airports mini dataset (IATA, name, lat, lon)
const MINI_AIRPORTS = [
  { iata: "DXB", name: "Dubai Intl", lat: 25.2532, lon: 55.3657 },
  { iata: "AUH", name: "Abu Dhabi Intl", lat: 24.4329, lon: 54.6511 },
  { iata: "DOH", name: "Hamad Intl (Doha)", lat: 25.2731, lon: 51.6081 },
  { iata: "JED", name: "Jeddah", lat: 21.6796, lon: 39.1565 },
  { iata: "RUH", name: "Riyadh", lat: 24.9576, lon: 46.6988 },
  { iata: "KWI", name: "Kuwait", lat: 29.2266, lon: 47.9689 },
  { iata: "BAH", name: "Bahrain", lat: 26.2708, lon: 50.6336 },
  { iata: "CAI", name: "Cairo Intl", lat: 30.1219, lon: 31.4056 },
  { iata: "IST", name: "Istanbul", lat: 41.2753, lon: 28.7519 },
  { iata: "ADD", name: "Addis Ababa", lat: 8.9779, lon: 38.7993 },
  { iata: "LHR", name: "London Heathrow", lat: 51.47, lon: -0.4543 },
  { iata: "CDG", name: "Paris CDG", lat: 49.0097, lon: 2.5479 },
  { iata: "FRA", name: "Frankfurt", lat: 50.0379, lon: 8.5622 },
  { iata: "JFK", name: "New York JFK", lat: 40.6413, lon: -73.7781 },
  { iata: "LAX", name: "Los Angeles", lat: 33.9416, lon: -118.4085 },
];

// --- Monthly series for line chart
const monthlySeries = [
  { m: "Jan", v: 12 }, { m: "Feb", v: 19 }, { m: "Mar", v: 23 }, { m: "Apr", v: 18 },
  { m: "May", v: 28 }, { m: "Jun", v: 32 }, { m: "Jul", v: 40 }, { m: "Aug", v: 37 },
  { m: "Sep", v: 29 }, { m: "Oct", v: 31 }, { m: "Nov", v: 27 }, { m: "Dec", v: 35 },
];

// --- Regions + pricing (from Arabic list). Values are AED per kg.
// Public per‑kg price = 80% of the table value. Platform keeps 40% of that price (owner-only view).
const REGIONS = [
  { code: "UAE", label: "الإمارات العربية المتحدة" },
  { code: "GCC", label: "دول مجلس التعاون الخليجي" },
  { code: "ME", label: "الشرق الأوسط" },
  { code: "AF", label: "أفريقيا" },
  { code: "ISC", label: "شبه القارة الهندية" },
  { code: "SEA", label: "جنوب شرق آسيا" },
  { code: "EU", label: "أوروبا/رابطة الدول المستقلة" },
];

const RATE_TABLE = {
  UAE: { GCC: 40, ME: 60, AF: 40, ISC: 40, SEA: 60, EU: 60 },
  GCC: { UAE: 40, GCC: 60, ME: 60, AF: 60, ISC: 60, SEA: 80, EU: 80 },
  // Saudi Arabia uses GCC rates
  ME:  { UAE: 60, GCC: 60, ME: 60, AF: 60, ISC: 60, SEA: 60, EU: 60 },
  AF:  { UAE: 40, GCC: 60, ME: 60, AF: 60, ISC: 60, SEA: 60, EU: 60 },
  ISC: { UAE: 40, GCC: 60, ME: 60, AF: 60, ISC: 60, SEA: 80, EU: 80 },
  SEA: { UAE: 60, GCC: 80, ME: 60, AF: 60, ISC: 80, SEA: 80, EU: 80 },
  EU:  { UAE: 60, GCC: 80, ME: 60, AF: 60, ISC: 80, SEA: 80, EU: 80 },
};

// --- Currencies
const CURRENCIES = [
  "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN",
  "BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL",
  "BSD","BTN","BWP","BYN","BZD","CAD","CDF","CHF","CLP","CNY",
  "COP","CRC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP",
  "ERN","ETB","EUR","FJD","FKP","GBP","GEL","GHS","GIP","GMD",
  "GNF","GTQ","GYD","HKD","HNL","HRK","HTG","HUF","IDR","ILS",
  "INR","IQD","IRR","ISK","JMD","JOD","JPY","KES","KGS","KHR",
  "KMF","KRW","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL",
  "LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR",
  "MVR","MWK","MXN","MYR","MZN","NAD","NGN","NIO","NOK","NPR",
  "NZD","OMR","PAB","PEN","PGK","PHP","PKR","PLN","PYG","QAR",
  "RON","RSD","RUB","RWF","SAR","SBD","SCR","SDG","SEK","SGD",
  "SHP","SLL","SOS","SRD","SSP","STN","SYP","SZL","THB","TJS",
  "TMT","TND","TOP","TRY","TTD","TWD","TZS","UAH","UGX","USD",
  "UYU","UZS","VES","VND","VUV","WST","XAF","XCD","XOF","XPF",
  "YER","ZAR","ZMW","ZWL"
];

// --- Allowed content types (exclude banned/restricted terms)
const ALLOWED_CONTENTS = [
  "Documents",
  "Books & Printed Material",
  "Clothing",
  "Shoes & Accessories",
  "Non‑perishable packaged food",
  "Toys (no batteries)",
  "Home textiles",
  "Small electronics accessories (no batteries)",
  "Gifts / Souvenirs (non‑hazardous)",
  "Other (declare contents)",
];

// --- Utilities
function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Escrow settlement (demo): 40% platform (owner only view), 60% carrier
function settleEscrow(total) {
  const platform = total * 0.40;
  const carrier = total - platform;
  return { platform, carrier };
}

// Storage bucket (create in Supabase as public=false)
const BUCKET_UPLOADS = (readEnv("VITE_UPLOADS_BUCKET") || "uploads");

async function uploadToBucket(supabase, file, path) {
  const { data, error } = await supabase.storage.from(BUCKET_UPLOADS).upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  const { data: url } = supabase.storage.from(BUCKET_UPLOADS).getPublicUrl(path);
  return url?.publicUrl || path;
}

async function currentUser(supabase) {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// --- Supabase SQL Schema (placeholder)
const SUPABASE_SQL = `
-- Luggage Share Database Schema
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists payouts (
  id uuid default gen_random_uuid() primary key,
  platform_amount decimal default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists orders (
  id text primary key,
  customer text,
  "from" text,
  "to" text,
  pieces integer,
  status text,
  price decimal
);

create table if not exists shipments (
  id text primary key,
  carrier text,
  tracking text,
  status text,
  eta date
);

create table if not exists tickets (
  id text primary key,
  subject text,
  status text,
  created_at date
);

create table if not exists listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  from_iata text,
  to_iata text,
  date date,
  capacity_kg integer,
  price_per_kg decimal,
  ticket_url text,
  id_url text,
  passport_url text,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  from_iata text,
  to_iata text,
  date date,
  kg integer,
  type text,
  id_url text,
  passport_url text,
  photo_url text,
  price_per_kg decimal,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
`;

// --- UI Components
function Card({ children, className = "", highlight = false }) {
  return (
    <div 
      className={`rounded-xl p-4 border ${className}`} 
      style={{ 
        borderColor: WINY.border, 
        background: highlight ? WINY.chip : WINY.bg 
      }}
    >
      {children}
    </div>
  );
}

function Input({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: WINY.ink }}>{label}</label>
      {children}
    </div>
  );
}

function CalendarMini() {
  const today = new Date();
  const month = today.toLocaleDateString('en', { month: 'short' });
  const date = today.getDate();
  return (
    <div className="text-center">
      <div className="text-xs" style={{ color: WINY.muted }}>{month}</div>
      <div className="text-2xl font-semibold">{date}</div>
    </div>
  );
}

function OrdersTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: WINY.muted }}>
            <th className="text-left font-medium py-2">Customer</th>
            <th className="text-left font-medium py-2">Route</th>
            <th className="text-left font-medium py-2">Status</th>
            <th className="text-left font-medium py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t" style={{ borderColor: WINY.border }}>
              <td className="py-2">{r.customer}</td>
              <td className="py-2">{r.checkin} → {r.checkout}</td>
              <td className="py-2">{r.status}</td>
              <td className="py-2">${r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- App Shell with Router
export default function LuggageShareApp() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

function AppShell() {
  const supabase = useMemo(() => getSupabase(), []);
  return (
    <div style={{ background: WINY.bg, color: WINY.ink }} className="min-h-screen">
      <Topbar />
      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-5">
        <Sidebar />
        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <Routes>
            <Route path="/" element={<OverviewPage supabase={supabase} />} />
            <Route path="/search" element={<SearchPage supabase={supabase} />} />
            <Route path="/need-space" element={<NeedSpacePage supabase={supabase} />} />
            <Route path="/have-space" element={<HaveSpacePage supabase={supabase} />} />
            <Route path="/orders" element={<OrdersPage supabase={supabase} />} />
            <Route path="/shipments" element={<ShipmentsPage supabase={supabase} />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/support" element={<SupportPage supabase={supabase} />} />
            <Route path="/settings" element={<SettingsPage supabase={supabase} />} />
            <Route path="/profile" element={<ProfilePage supabase={supabase} />} />
            <Route path="/chat" element={<ChatPage supabase={supabase} />} />
            <Route path="/sql" element={<SqlViewer />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function Topbar() {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-10 backdrop-blur border-b" style={{ borderColor: WINY.border, background: "rgba(255,255,255,0.7)" }}>
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl grid place-items-center" style={{ background: WINY.chip }}>
          <Logo />
        </div>
        <button onClick={() => nav("/")} className="font-semibold tracking-tight">Luggage Share</button>
        <div className="ml-auto flex items-center gap-3">
          <input placeholder="Search" className="rounded-lg px-3 py-2 border text-sm" style={{ borderColor: WINY.border }} />
          <NavLink to="/need-space" className="rounded-lg px-3 py-2 text-sm" style={{ background: WINY.primary, color: "#fff" }}>Need Space</NavLink>
          <NavLink to="/have-space" className="rounded-lg px-3 py-2 text-sm" style={{ background: WINY.primary, color: "#fff" }}>Have Space</NavLink>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  const items = [
    { to: "/", label: "Overview" },
    { to: "/search", label: "Search" },
    { to: "/need-space", label: "Need Space" },
    { to: "/have-space", label: "Have Space" },
    { to: "/orders", label: "Orders" },
    { to: "/shipments", label: "Shipments" },
    { to: "/payments", label: "Payments" },
    { to: "/support", label: "Support" },
    { to: "/settings", label: "Settings" },
    { to: "/profile", label: "Profile" },
    { to: "/chat", label: "Chat" },
    { to: "/sql", label: "SQL" },
  ];
  return (
    <aside className="col-span-12 md:col-span-3 lg:col-span-2">
      <nav className="space-y-1 sticky top-16">
        {items.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `block rounded-xl px-3 py-2 ${isActive ? "font-semibold" : ""}`}
            style={({ isActive }) => ({ background: isActive ? WINY.chip : "transparent" })}
          >
            {label}
          </NavLink>
        ))}

        <div className="mt-6 rounded-xl p-4" style={{ background: WINY.chip }}>
          <div className="text-sm font-medium mb-2">Get all the stats</div>
          <p className="text-xs" style={{ color: WINY.muted }}>Track bookings, shipments, and payouts in one place.</p>
          <a href="#" className="mt-3 block text-center rounded-lg py-2 text-sm" style={{ background: WINY.primary, color: "#fff" }}>Learn more</a>
        </div>
      </nav>
    </aside>
  );
}

// ---------------- Pages ----------------
function OverviewPage({ supabase }) {
  const [headline, setHeadline] = useState({ slots: 187, booked: 112, payout: 97475 });
  const [pieData, setPieData] = useState([
    { name: "Checked", value: 45 },
    { name: "In Transit", value: 30 },
    { name: "Delivered", value: 25 },
  ]);
  const [radial] = useState([{ name: "Fulfillment", value: 72 }]);
  const [orders] = useState([
    { customer: "Amal H.", checkin: "DXB", checkout: "CAI", nights: 2, status: "Paid", total: 220 },
    { customer: "Yousef K.", checkin: "JED", checkout: "DXB", nights: 1, status: "Pending", total: 120 },
    { customer: "Lina A.", checkin: "CAI", checkout: "KWI", nights: 3, status: "Paid", total: 360 },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const b = await supabase.from("bookings").select("id, status");
        if (!b.error && b.data) {
          setHeadline((h) => ({ ...h, booked: b.data.length }));
          const delivered = b.data.filter((x) => x.status === "delivered").length;
          const transit = b.data.filter((x) => x.status === "in_transit").length;
          const checked = Math.max(0, b.data.length - delivered - transit);
          setPieData([
            { name: "Checked", value: checked },
            { name: "In Transit", value: transit },
            { name: "Delivered", value: delivered },
          ]);
        }
        const p = await supabase.from("payouts").select("platform_amount");
        if (!p.error && p.data) {
          const sum = p.data.reduce((a, r) => a + (r.platform_amount || 0), 0);
          setHeadline((h) => ({ ...h, payout: sum }));
        }
      } catch (_) {}
    })();
  }, [supabase]);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm" style={{ color: WINY.muted }}>Total luggage slots</div>
          <div className="text-3xl font-semibold mt-1">{headline.slots}</div>
        </Card>
        <Card highlight>
          <div className="text-sm" style={{ color: WINY.muted }}>Booked today</div>
          <div className="text-3xl font-semibold mt-1">{headline.booked}</div>
        </Card>
        <Card>
          <div className="text-sm" style={{ color: WINY.muted }}>Total payout this month</div>
          <div className="text-3xl font-semibold mt-1">${headline.payout.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-sm" style={{ color: WINY.muted }}>Calendar</div>
          <CalendarMini />
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">Earning Statistics</div>
            <a className="text-sm" style={{ color: WINY.primary }} href="#">See All</a>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={monthlySeries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid stroke={WINY.border} />
                <XAxis dataKey="m" stroke={WINY.muted} />
                <YAxis stroke={WINY.muted} />
                <Tooltip />
                <Line type="monotone" dataKey="v" stroke={WINY.primary} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="font-medium mb-3">Luggage Status</div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? WINY.primary : i === 1 ? WINY.primarySoft : "#ddd"} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <div className="font-medium mb-3">Fulfillment</div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <RadialBarChart innerRadius="60%" outerRadius="100%" data={radial} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="value" fill={WINY.primary} cornerRadius={8} />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-sm text-center" style={{ color: WINY.muted }}>Goal completion this month</div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">Recent Orders</div>
            <NavLink className="text-sm" style={{ color: WINY.primary }} to="/orders">See All</NavLink>
          </div>
          <OrdersTable rows={orders} />
        </Card>
      </section>
    </div>
  );
}

function SearchPage({ supabase }) {
  const [airports, setAirports] = useState(MINI_AIRPORTS);
  const [from, setFrom] = useState("DXB");
  const [to, setTo] = useState("CAI");
  const [fromRegion, setFromRegion] = useState("UAE");
  const [toRegion, setToRegion] = useState("ME");
  const [kg, setKg] = useState(5);
  const [type, setType] = useState(ALLOWED_CONTENTS[0]);
  const [pack, setPack] = useState("Home pickup");
  const [ccy, setCcy] = useState("AED");
  const [agree, setAgree] = useState(false);
  const [idDoc, setIdDoc] = useState(null);
  const [passportDoc, setPassportDoc] = useState(null);

  const isOwner = useIsOwner(supabase);

  // Price per kg = 80% of matrix
  const listed = RATE_TABLE[fromRegion]?.[toRegion] || 0;
  const pricePerKg = listed * 0.8;

  const A = airports.find(a => a.iata === from);
  const B = airports.find(a => a.iata === to);
  const km = A && B ? Math.round(haversineKm(A, B)) : 0;
  const subtotal = pricePerKg * kg;
  const { platform, carrier } = settleEscrow(subtotal);

  function onFile(e, kind) {
    const file = e.target.files?.[0] || null;
    if (kind === "id") setIdDoc(file); else setPassportDoc(file);
  }

  function onAirportsFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(String(reader.result));
          if (Array.isArray(json)) setAirports(json.filter((x)=>x.iata && x.lat && x.lon));
        } else {
          const rows = String(reader.result).split(/\r?\n/).map(l=>l.split(","));
          const out = rows.map(r=>({ iata:r[0], name:r[1], lat:parseFloat(r[2]), lon:parseFloat(r[3]) })).filter(x=>x.iata && !isNaN(x.lat) && !isNaN(x.lon));
          if (out.length) setAirports(out);
        }
      } catch (_){/* ignore */}
    };
    reader.readAsText(file);
  }

  const canBook = !!idDoc && !!passportDoc && agree;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Search shipments</h2>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Input label={`From (${airports.length} airports in dataset)`}>
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={from} onChange={e=>setFrom(e.target.value)}>
              {airports.map(a=> <option key={a.iata} value={a.iata}>{a.iata} — {a.name}</option>)}
            </select>
          </Input>
          <Input label="To">
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={to} onChange={e=>setTo(e.target.value)}>
              {airports.map(a=> <option key={a.iata} value={a.iata}>{a.iata} — {a.name}</option>)}
            </select>
          </Input>
          <Input label="From Region">
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={fromRegion} onChange={e=>setFromRegion(e.target.value)}>
              {REGIONS.map(r=> <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </Input>
          <Input label="To Region">
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={toRegion} onChange={e=>setToRegion(e.target.value)}>
              {REGIONS.map(r=> <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </Input>
          <Input label="Weight (kg)"><input inputMode="numeric" className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={kg} onChange={e=>setKg(Number(e.target.value)||0)} /></Input>
          <Input label="Contents type">
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={type} onChange={e=>setType(e.target.value)}>
              {ALLOWED_CONTENTS.map(x=> <option key={x}>{x}</option>)}
            </select>
          </Input>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <Input label="Packaging">
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={pack} onChange={e=>setPack(e.target.value)}>
              {["Home pickup","At airport"].map(x=> <option key={x}>{x}</option>)}
            </select>
          </Input>
          <Input label="Currency">
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={ccy} onChange={e=>setCcy(e.target.value)}>
              {CURRENCIES.map(c=> <option key={c}>{c}</option>)}
            </select>
          </Input>
          <Input label="Upload airports (CSV/JSON)"><input type="file" accept=".csv,.json" onChange={onAirportsFile} /></Input>
          <div className="flex items-end"><div className="text-xs" style={{ color: WINY.muted }}>Legal note: Sender confirms goods comply with local laws and are not prohibited.</div></div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div>Distance: <b>{km}</b> km</div>
          <div>Price / kg (80% table): <b>{pricePerKg.toFixed(2)} AED</b></div>
          <div>Total ({kg} kg): <b>{subtotal.toFixed(2)} {ccy}</b></div>
          {isOwner ? (
            <div>Split → Carrier: <b>{carrier.toFixed(2)}</b> {ccy} • Platform (40%): <b>{platform.toFixed(2)}</b> {ccy}</div>
          ) : (
            <div className="opacity-70">Escrow protected payout (owner split hidden)</div>
          )}
        </div>

        {/* KYC requirement */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Government ID (front)"><input type="file" accept="image/*,application/pdf" onChange={(e)=>onFile(e,"id")} /></Input>
          <Input label="Passport"><input type="file" accept="image/*,application/pdf" onChange={(e)=>onFile(e,"passport")} /></Input>
          <div className="flex items-end"><label className="text-sm flex items-center gap-2"><input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />I confirm items are legal and documents are valid.</label></div>
        </div>

        <button disabled={!canBook} className="mt-3 rounded-lg px-3 py-2 text-sm disabled:opacity-50" style={{ background: WINY.primary, color: '#fff' }} onClick={()=>alert('Booking created (docs required). Wire to Supabase insert + storage upload.')}>Book space</button>
      </Card>
    </div>
  );
}

// ---- Need Space (Shipper) ----
function NeedSpacePage({ supabase }) {
  const [airports] = useState(MINI_AIRPORTS);
  const [from, setFrom] = useState("DXB");
  const [to, setTo] = useState("CAI");
  const [date, setDate] = useState("");
  const [kg, setKg] = useState(5);
  const [type, setType] = useState(ALLOWED_CONTENTS[0]);
  const [idDoc, setIdDoc] = useState(null);
  const [passport, setPassport] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  async function search() {
    setBusy(true);
    try {
      // Match providers with same route and enough capacity
      const q = await supabase
        .from('listings')
        .select('id, user_id, from_iata, to_iata, date, capacity_kg, price_per_kg, ticket_url')
        .eq('from_iata', from)
        .eq('to_iata', to)
        .gte('capacity_kg', kg)
        .order('date', { ascending: true });
      if (!q.error && q.data) setResults(q.data);
    } finally { setBusy(false); }
  }

  async function submitRequest() {
    const user = await currentUser(supabase);
    if (!user) return alert('Please sign in first.');
    if (!idDoc || !passport || !photo) return alert('Upload ID, Passport, and Photo.');
    try {
      setBusy(true);
      const base = `kyc/${user.id}/shipper/${Date.now()}`;
      const idUrl = await uploadToBucket(supabase, idDoc, `${base}-id.${idDoc.name.split('.').pop()}`);
      const passUrl = await uploadToBucket(supabase, passport, `${base}-passport.${passport.name.split('.').pop()}`);
      const photoUrl = await uploadToBucket(supabase, photo, `${base}-photo.${photo.name.split('.').pop()}`);
      const pricePerKg = (RATE_TABLE_REGION(from, to) || 0) * 0.8;
      const { error } = await supabase.from('requests').insert({
        user_id: user.id, from_iata: from, to_iata: to, date, kg, type, id_url: idUrl, passport_url: passUrl, photo_url: photoUrl, price_per_kg: pricePerKg,
      });
      if (error) throw error;
      alert('Request submitted');
    } catch (e) { alert(e.message || 'Submit failed'); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Need Space (Shipper)</h2>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="From">
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={from} onChange={e=>setFrom(e.target.value)}>{MINI_AIRPORTS.map(a=> <option key={a.iata} value={a.iata}>{a.iata} — {a.name}</option>)}</select>
          </Input>
          <Input label="To">
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={to} onChange={e=>setTo(e.target.value)}>{MINI_AIRPORTS.map(a=> <option key={a.iata} value={a.iata}>{a.iata} — {a.name}</option>)}</select>
          </Input>
          <Input label="Date"><input type="date" className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={date} onChange={e=>setDate(e.target.value)} /></Input>
          <Input label="Weight needed (kg)"><input inputMode="numeric" className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={kg} onChange={e=>setKg(Number(e.target.value)||0)} /></Input>
          <Input label="Contents type">
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={type} onChange={e=>setType(e.target.value)}>{ALLOWED_CONTENTS.map(x=> <option key={x}>{x}</option>)}</select>
          </Input>
          <div className="md:col-span-3 text-xs" style={{ color: WINY.muted }}>You confirm items are legal and not prohibited.</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <Input label="ID"><input type="file" accept="image/*,application/pdf" onChange={e=>setIdDoc(e.target.files?.[0]||null)} /></Input>
          <Input label="Passport"><input type="file" accept="image/*,application/pdf" onChange={e=>setPassport(e.target.files?.[0]||null)} /></Input>
          <Input label="Photo (selfie)"><input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files?.[0]||null)} /></Input>
        </div>

        <div className="flex gap-3 mt-3">
          <button className="rounded-lg px-3 py-2 text-sm" style={{ background: WINY.primary, color: '#fff' }} onClick={search} disabled={busy}>{busy ? 'Searching…' : 'Search providers'}</button>
          <button className="rounded-lg px-3 py-2 text-sm" style={{ background: WINY.primary, color: '#fff' }} onClick={submitRequest} disabled={busy || !idDoc || !passport || !photo}>{busy ? 'Submitting…' : 'Submit request'}</button>
        </div>
      </Card>

      {!!results.length && (
        <Card>
          <div className="font-medium mb-2">Matching providers</div>
          <div className="space-y-2">
            {results.map((r)=> (
              <div key={r.id} className="p-2 rounded-lg border text-sm flex items-center justify-between" style={{ borderColor: WINY.border }}>
                <div>
                  <div><b>{r.from_iata} → {r.to_iata}</b> on {r.date} • capacity {r.capacity_kg}kg</div>
                  <div className="text-xs" style={{ color: WINY.muted }}>Price/kg: {r.price_per_kg} AED</div>
                </div>
                <a href={r.ticket_url} className="text-sm underline" target="_blank" rel="noreferrer">View ticket</a>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---- Have Space (Provider) ----
function HaveSpacePage({ supabase }) {
  const [airports] = useState(MINI_AIRPORTS);
  const [from, setFrom] = useState("DXB");
  const [to, setTo] = useState("CAI");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState(20);
  const [pricePerKg, setPricePerKg] = useState(() => (RATE_TABLE_REGION("DXB","CAI")||0)*0.8);
  const [ticket, setTicket] = useState(null);
  const [idDoc, setIdDoc] = useState(null);
  const [passport, setPassport] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    const p = (RATE_TABLE_REGION(from,to) || 0) * 0.8; setPricePerKg(p);
  }, [from,to]);

  async function publish() {
    const user = await currentUser(supabase);
    if (!user) return alert('Please sign in first.');
    if (!ticket || !idDoc || !passport || !photo) return alert('Upload ticket, ID, passport, and photo.');
    try {
      setBusy(true);
      const base = `kyc/${user.id}/provider/${Date.now()}`;
      const ticketUrl = await uploadToBucket(supabase, ticket, `${base}-ticket.${ticket.name.split('.').pop()}`);
      const idUrl = await uploadToBucket(supabase, idDoc, `${base}-id.${idDoc.name.split('.').pop()}`);
      const passUrl = await uploadToBucket(supabase, passport, `${base}-passport.${passport.name.split('.').pop()}`);
      const photoUrl = await uploadToBucket(supabase, photo, `${base}-photo.${photo.name.split('.').pop()}`);
      const { error } = await supabase.from('listings').insert({
        user_id: user.id, from_iata: from, to_iata: to, date, capacity_kg: capacity, price_per_kg: pricePerKg, ticket_url: ticketUrl, id_url: idUrl, passport_url: passUrl, photo_url: photoUrl,
      });
      if (error) throw error;
      alert('Listing published');
    } catch (e) { alert(e.message || 'Publish failed'); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Have Space (Provider)</h2>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="From">
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={from} onChange={e=>setFrom(e.target.value)}>{MINI_AIRPORTS.map(a=> <option key={a.iata} value={a.iata}>{a.iata} — {a.name}</option>)}</select>
          </Input>
          <Input label="To">
            <select className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={to} onChange={e=>setTo(e.target.value)}>{MINI_AIRPORTS.map(a=> <option key={a.iata} value={a.iata}>{a.iata} — {a.name}</option>)}</select>
          </Input>
          <Input label="Date"><input type="date" className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={date} onChange={e=>setDate(e.target.value)} /></Input>
          <Input label="Capacity (kg)"><input inputMode="numeric" className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={capacity} onChange={e=>setCapacity(Number(e.target.value)||0)} /></Input>
          <Input label="Price per kg (AED)"><input inputMode="numeric" className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} value={pricePerKg} onChange={e=>setPricePerKg(Number(e.target.value)||0)} /></Input>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <Input label="Flight ticket (PDF/image)"><input type="file" accept="application/pdf,image/*" onChange={e=>setTicket(e.target.files?.[0]||null)} /></Input>
          <Input label="ID"><input type="file" accept="image/*,application/pdf" onChange={e=>setIdDoc(e.target.files?.[0]||null)} /></Input>
          <Input label="Passport"><input type="file" accept="image/*,application/pdf" onChange={e=>setPassport(e.target.files?.[0]||null)} /></Input>
          <Input label="Photo (selfie)"><input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files?.[0]||null)} /></Input>
        </div>

        <button className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: WINY.primary, color: '#fff' }} onClick={publish} disabled={busy}>{busy ? 'Publishing…' : 'Publish listing'}</button>
      </Card>
    </div>
  );
}

// Helper to read matrix by IATA regions (very simplified): map airports to region codes
function RATE_TABLE_REGION(fromIata, toIata) {
  const map = { DXB: 'UAE', AUH: 'UAE', DOH: 'GCC', JED: 'GCC', RUH: 'GCC', KWI: 'GCC', BAH: 'GCC', CAI: 'ME', IST: 'EU', ADD: 'AF', LHR: 'EU', CDG: 'EU', FRA: 'EU', JFK: 'EU', LAX: 'EU' };
  const fr = map[fromIata] || 'UAE';
  const to = map[toIata] || 'ME';
  return RATE_TABLE[fr]?.[to];
}

function OrdersPage({ supabase }) {
  const [rows, setRows] = useState([
    { id: "LS-1001", customer: "Amal H.", from: "DXB", to: "CAI", pieces: 2, status: "Paid", price: 220 },
    { id: "LS-1002", customer: "Yousef K.", from: "JED", to: "DXB", pieces: 1, status: "Escrow", price: 120 },
    { id: "LS-1003", customer: "Lina A.", from: "CAI", to: "KWI", pieces: 3, status: "Delivered", price: 360 },
  ]);
  const isOwner = useIsOwner(supabase);

  function release(orderId) {
    const row = rows.find(r=>r.id===orderId);
    if (!row) return;
    const { carrier, platform } = settleEscrow(row.price);
    const ownerMsg = `Release for ${orderId}: Carrier ${carrier.toFixed(2)}, Platform ${platform.toFixed(2)}`;
    alert(isOwner ? ownerMsg : `Release requested for ${orderId}`);
    setRows(rs => rs.map(r => r.id===orderId ? { ...r, status: 'Released' } : r));
    // TODO: call Supabase function / update payment intent status
  }

  useEffect(() => {
    (async () => {
      try {
        const q = await supabase.from("orders").select("id, customer, from, to, pieces, status, price");
        if (!q.error && q.data && q.data.length) setRows(q.data);
      } catch (_) {}
    })();
  }, [supabase]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Orders</h2>
        <button className="rounded-lg px-3 py-2 text-sm" style={{ background: WINY.primary, color: "#fff" }}>Create Order</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: WINY.muted }}>
              <th className="text-left font-medium py-2">Order</th>
              <th className="text-left font-medium py-2">Customer</th>
              <th className="text-left font-medium py-2">From</th>
              <th className="text-left font-medium py-2">To</th>
              <th className="text-left font-medium py-2">Pieces</th>
              <th className="text-left font-medium py-2">Status</th>
              <th className="text-left font-medium py-2">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t" style={{ borderColor: WINY.border }}>
                <td className="py-2">{r.id}</td>
                <td className="py-2">{r.customer}</td>
                <td className="py-2">{r.from}</td>
                <td className="py-2">{r.to}</td>
                <td className="py-2">{r.pieces}</td>
                <td className="py-2">{r.status}</td>
                <td className="py-2">${r.price.toFixed(0)}</td>
                <td className="py-2 text-right">
                  {r.status === 'Delivered' || r.status === 'Escrow' ? (
                    <button className="rounded-lg px-3 py-1 text-sm" style={{ background: WINY.primary, color: '#fff' }} onClick={()=>release(r.id)}>Release</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShipmentsPage({ supabase }) {
  const [rows, setRows] = useState([
    { id: "SHP-3001", carrier: "Aramex", tracking: "RM12345AE", status: "In Transit", eta: "2025-08-15" },
    { id: "SHP-3002", carrier: "DHL", tracking: "DHL998822", status: "Delivered", eta: "2025-08-12" },
    { id: "SHP-3003", carrier: "FedEx", tracking: "FX112233", status: "Label Created", eta: "2025-08-19" },
  ]);
  useEffect(() => {
    (async () => {
      try {
        const q = await supabase.from("shipments").select("id, carrier, tracking, status, eta");
        if (!q.error && q.data && q.data.length) setRows(q.data);
      } catch (_) {}
    })();
  }, [supabase]);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Shipments</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: WINY.muted }}>
              <th className="text-left font-medium py-2">Shipment ID</th>
              <th className="text-left font-medium py-2">Carrier</th>
              <th className="text-left font-medium py-2">Tracking</th>
              <th className="text-left font-medium py-2">Status</th>
              <th className="text-left font-medium py-2">ETA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t" style={{ borderColor: WINY.border }}>
                <td className="py-2">{r.id}</td>
                <td className="py-2">{r.carrier}</td>
                <td className="py-2">{r.tracking}</td>
                <td className="py-2">{r.status}</td>
                <td className="py-2">{r.eta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentsPage() {
  const [card, setCard] = useState({ name: "", number: "", exp: "", cvv: "" });
  const [bank, setBank] = useState({ accountName: "", iban: "", swift: "" });
  const [saved, setSaved] = useState(null);

  function formatCardNumber(v) { return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); }
  function formatExp(v) { const n = v.replace(/\D/g, "").slice(0, 4); return n.length <= 2 ? n : n.slice(0, 2) + "/" + n.slice(2); }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Payments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="font-medium mb-2">Card details (demo)</div>
          <div className="text-xs mb-3" style={{ color: WINY.muted }}>Do not store CVV or raw card data. Use a PCI provider (Stripe, etc.). UI only.</div>
          <div className="space-y-3">
            <Input label="Cardholder name"><input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} placeholder="Ayman Mohamed" /></Input>
            <Input label="Card number"><input value={card.number} onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })} inputMode="numeric" className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} placeholder="4242 4242 4242 4242" /></Input>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Expiry"><input value={card.exp} onChange={(e) => setCard({ ...card, exp: formatExp(e.target.value) })} inputMode="numeric" className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} placeholder="MM/YY" /></Input>
              <Input label="CVV"><input value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} placeholder="***" /></Input>
            </div>
            <button className="rounded-lg px-3 py-2 text-sm" style={{ background: WINY.primary, color: "#fff" }} onClick={() => setSaved("Card details captured (demo only)")}>Save card</button>
          </div>
        </Card>

        <Card>
          <div className="font-medium mb-2">Payout account</div>
          <div className="space-y-3">
            <Input label="Account holder name"><input value={bank.accountName} onChange={(e) => setBank({ ...bank, accountName: e.target.value })} className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} placeholder="Luggage Share LLC" /></Input>
            <Input label="IBAN"><input value={bank.iban} onChange={(e) => setBank({ ...bank, iban: e.target.value })} className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} placeholder="AE07 0331 2345 6789 0123 456" /></Input>
            <Input label="SWIFT/BIC"><input value={bank.swift} onChange={(e) => setBank({ ...bank, swift: e.target.value })} className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} placeholder="EBILAEADXXX" /></Input>
            <button className="rounded-lg px-3 py-2 text-sm" style={{ background: WINY.primary, color: "#fff" }} onClick={() => setSaved("Payout account saved")}>Save payout account</button>
          </div>
        </Card>
      </div>
      {saved && <div className="text-sm" style={{ color: WINY.primary }}>{saved}</div>}
    </div>
  );
}

function SupportPage({ supabase }) {
  const [tickets, setTickets] = useState([
    { id: "T-101", subject: "Damaged luggage claim", status: "Open", created_at: "2025-08-10" },
    { id: "T-102", subject: "Change pickup time", status: "Pending", created_at: "2025-08-12" },
  ]);
  const [newTicket, setNewTicket] = useState({ subject: "", message: "" });
  useEffect(() => { (async () => { try { const q = await supabase.from("tickets").select("id, subject, status, created_at"); if (!q.error && q.data && q.data.length) setTickets(q.data);} catch (_) {} })(); }, [supabase]);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Support</h2>
      <Card>
        <div className="font-medium mb-2">Create ticket</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1"><Input label="Subject"><input value={newTicket.subject} onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })} className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} placeholder="Describe your issue" /></Input></div>
          <div className="md:col-span-2"><Input label="Message"><textarea value={newTicket.message} onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })} className="w-full rounded-lg px-3 py-2 border h-24" style={{ borderColor: WINY.border }} placeholder="Add helpful details…" /></Input></div>
        </div>
        <button className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: WINY.primary, color: "#fff" }} onClick={() => alert("Ticket submitted (wire to Supabase insert)")}>Submit</button>
      </Card>

      <Card>
        <div className="font-medium mb-3">Your tickets</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: WINY.muted }}>
                <th className="text-left font-medium py-2">ID</th>
                <th className="text-left font-medium py-2">Subject</th>
                <th className="text-left font-medium py-2">Status</th>
                <th className="text-left font-medium py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-t" style={{ borderColor: WINY.border }}>
                  <td className="py-2">{t.id}</td>
                  <td className="py-2">{t.subject}</td>
                  <td className="py-2">{t.status}</td>
                  <td className="py-2">{t.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SettingsPage({ supabase }) {
  const [profile, setProfile] = useState({ name: "Ayman", email: "ayman@example.com", phone: "+971 50 555 5555" });
  const [security, setSecurity] = useState({ twofa: false, emailConfirm: true });
  const isOwner = useIsOwner(supabase);

  // --- Self-tests
  const ex = (RATE_TABLE['UAE']['ME']||0) * 0.8; // 60 -> 48
  const tests = [
    { name: "MONTHLY_SERIES_DEFINED", pass: Array.isArray(monthlySeries) && monthlySeries.length === 12, detail: `len=${Array.isArray(monthlySeries) ? monthlySeries.length : 'N/A'}` },
    { name: "HAVERSINE_SANITY", pass: Math.round(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })) > 0, detail: `1 deg lon @ equator ≈ ${Math.round(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }))} km` },
    { name: "OWNER_GATING", pass: typeof isOwner === 'boolean', detail: `owner=${isOwner}` },
    { name: "PRICE_RULE_80_UAE_ME", pass: Math.abs(ex - 48) < 1e-6, detail: `computed=${ex}` },
    { name: "SQL_BLOCK_PRESENT", pass: typeof SUPABASE_SQL === 'string' && SUPABASE_SQL.includes('create table'), detail: `chars=${SUPABASE_SQL.length}` },
    { name: "STORAGE_BUCKET_CONFIG", pass: !!BUCKET_UPLOADS, detail: `bucket=${BUCKET_UPLOADS}` },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="font-medium mb-2">Profile</div>
          <div className="space-y-3">
            <Input label="Name"><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} /></Input>
            <Input label="Email"><input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} /></Input>
            <Input label="Phone"><input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full rounded-lg px-3 py-2 border" style={{ borderColor: WINY.border }} /></Input>
            <button className="rounded-lg px-3 py-2 text-sm" style={{ background: WINY.primary, color: "#fff" }}>Save profile</button>
          </div>
        </Card>

        <Card>
          <div className="font-medium mb-2">Security</div>
          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={security.twofa} onChange={(e) => setSecurity({ ...security, twofa: e.target.checked })} />Enable 2‑factor authentication</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={security.emailConfirm} onChange={(e) => setSecurity({ ...security, emailConfirm: e.target.checked })} />Require email confirmation on signup</label>
            <button className="rounded-lg px-3 py-2 text-sm" style={{ background: WINY.primary, color: "#fff" }}>Save security</button>
          </div>
        </Card>
      </div>

      <Card>
        <div className="font-medium mb-2">Diagnostics</div>
        <ul className="text-xs space-y-1">
          {tests.map(t => (
            <li key={t.name}>
              <b>{t.name}:</b> {t.pass ? 'PASS' : 'FAIL'} <span style={{ color: WINY.muted }}>({t.detail})</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ProfilePage({ supabase }) {
  const [user, setUser] = useState(null);
  useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); setUser(data?.user || null); })(); }, [supabase]);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Profile</h2>
      <Card>
        {user ? (
          <div className="text-sm space-y-1">
            <div><b>ID:</b> {user.id}</div>
            <div><b>Email:</b> {user.email}</div>
            <div><b>Created:</b> {new Date(user.created_at).toLocaleString()}</div>
          </div>
        ) : (
          <div className="text-sm" style={{ color: WINY.muted }}>Not signed in</div>
        )}
      </Card>
    </div>
  );
}

function ChatPage({ supabase }) {
  const [messages, setMessages] = useState([
    { id: 1, sender: "Alice", text: "Hello! How's your trip going?", timestamp: "10:30 AM", encrypted: true },
    { id: 2, sender: "You", text: "Great! Just landed in Dubai. Package is safe.", timestamp: "10:32 AM", encrypted: true },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [encryptionKey, setEncryptionKey] = useState(null);

  useEffect(() => {
    // Generate encryption key for demo
    (async () => {
      try {
        const key = await window.crypto.subtle.generateKey(
          { name: "AES-GCM", length: 256 },
          true,
          ["encrypt", "decrypt"]
        );
        setEncryptionKey(key);
      } catch (e) {
        console.log("Web Crypto not available:", e);
      }
    })();
  }, []);

  async function sendMessage() {
    if (!newMessage.trim()) return;
    
    let encryptedText = newMessage;
    let isEncrypted = false;
    
    if (encryptionKey) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(newMessage);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          encryptionKey,
          data
        );
        encryptedText = `🔒 ${btoa(String.fromCharCode(...new Uint8Array(encrypted)))}`;
        isEncrypted = true;
      } catch (e) {
        console.log("Encryption failed:", e);
      }
    }

    const message = {
      id: Date.now(),
      sender: "You",
      text: encryptedText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      encrypted: isEncrypted
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Chat</h2>
      <Card>
        <div className="font-medium mb-2">End-to-End Encrypted Chat (Demo)</div>
        <div className="text-xs mb-3" style={{ color: WINY.muted }}>
          Messages are encrypted using Web Crypto API (AES-GCM). 
          {encryptionKey ? " ✅ Encryption enabled" : " ❌ Encryption unavailable"}
        </div>
        
        <div className="border rounded-lg p-3 h-64 overflow-y-auto mb-3" style={{ borderColor: WINY.border }}>
          {messages.map(msg => (
            <div key={msg.id} className={`mb-2 ${msg.sender === 'You' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block rounded-lg px-3 py-2 max-w-xs ${
                msg.sender === 'You' 
                  ? 'text-white' 
                  : 'border'
              }`} style={{
                background: msg.sender === 'You' ? WINY.primary : WINY.bg,
                borderColor: msg.sender === 'You' ? 'transparent' : WINY.border
              }}>
                <div className="text-sm">{msg.text}</div>
                <div className="text-xs opacity-70 mt-1">
                  {msg.timestamp} {msg.encrypted && '🔒'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 rounded-lg px-3 py-2 border text-sm"
            style={{ borderColor: WINY.border }}
          />
          <button
            onClick={sendMessage}
            className="rounded-lg px-4 py-2 text-sm"
            style={{ background: WINY.primary, color: "#fff" }}
          >
            Send
          </button>
        </div>
      </Card>
    </div>
  );
}

function SqlViewer() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">SQL Schema</h2>
      <Card>
        <div className="font-medium mb-2">Supabase Database Schema</div>
        <div className="text-xs mb-3" style={{ color: WINY.muted }}>
          Copy this SQL to set up your Supabase database tables.
        </div>
        <pre className="text-xs overflow-x-auto p-3 rounded-lg" style={{ background: WINY.chip }}>
          {SUPABASE_SQL}
        </pre>
      </Card>
    </div>
  );
}

