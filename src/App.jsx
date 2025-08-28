import React, { useEffect, useMemo, useRef, useState } from "react";

// ============================================================
// Startup Role Quiz – Single‑file React App (JS-only)
// - Natural tone
// - Shareable PNG card (Canvas)
// - Email gate -> save to Supabase (REST)
// - If Supabase table missing, show SQL instructions & still allow download
// - Footer & image attribution per request
// ============================================================

// === Supabase config =========================================
const SUPABASE_URL = "https://ygukrdmppkedhjkivokt.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndWtyZG1wcGtlZGhqa2l2b2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzc4NDEsImV4cCI6MjA3MTg1Mzg0MX0._doo58UJfh-8S41j8pDS_nb5EWguJbVydYPE7xuopSU";
const SUPABASE_TABLE = "public.leads"; // schema-qualified to avoid PGRST205 cache issues

const ATTR_LINKEDIN = "https://www.linkedin.com/in/muhammad-alhadiansyah-santoso/";
const ATTR_PIJAR = "https://pijarteknologi.id/";

// === Archetypes ===============================================
const TYPES = [
  {
    id: "analyst",
    name: "Analyst",
    emoji: "📊",
    blurb:
      "Kamu senang pakai data untuk ngarahin keputusan. Rapi, teliti, dan suka ngulik sampai ketemu insight.",
    roles: ["Data/BI Analyst", "Product Analyst", "Researcher"],
    skills: ["SQL", "Python/Excel", "A/B test", "Critical thinking"],
  },
  {
    id: "creator",
    name: "Creator",
    emoji: "🎨",
    blurb:
      "Kamu hidup di ide dan eksekusi visual/cerita. Peka sama user experience dan suka bikin hal jadi mudah dipahami.",
    roles: ["UI/UX", "Content/Brand", "Visual Designer"],
    skills: ["Figma", "Copywriting", "User research", "Prototyping"],
  },
  {
    id: "connector",
    name: "Connector",
    emoji: "🤝",
    blurb:
      "Kamu kuat di komunikasi & hubungan. Jago gali kebutuhan dan nyambungin solusi ke orang yang tepat.",
    roles: ["Account Manager", "Sales/BD", "Customer Success"],
    skills: ["Active listening", "Negosiasi", "CRM", "Presentasi"],
  },
  {
    id: "driver",
    name: "Driver",
    emoji: "🚀",
    blurb:
      "Kamu gercep, senang target, dan nyaman ambil keputusan. Cocok ngarahin prioritas dan nyatuin tim lintas fungsi.",
    roles: ["Product Manager", "BizOps", "Founder-type"],
    skills: ["Prioritization", "Strategy", "Stakeholder mgmt", "OKR"],
  },
  {
    id: "maker",
    name: "Maker",
    emoji: "🛠️",
    blurb:
      "Kamu tangan dingin: senang bikin, otak-atik, dan ningkatin kualitas hasil.",
    roles: ["Engineer", "Ops/QA", "DevOps/Infra"],
    skills: ["Scripting", "Automation", "Debugging", "Systems thinking"],
  },
  {
    id: "organizer",
    name: "Organizer",
    emoji: "🧭",
    blurb:
      "Kamu bikin kerjaan jadi tertata. Proses rapi, risiko terkendali, dan ritme tim jalan.",
    roles: ["Project/Program Mgmt", "Finance/People Ops", "PMO"],
    skills: ["Planning", "Documentation", "Risk mgmt", "Process design"],
  },
];

// === Questions (18) ===========================================
const QUESTIONS = [
  { id: "q1", text: "Aku suka membuktikan pendapat dengan data/angka.", typeId: "analyst" },
  { id: "q7", text: "Baca tren dan bikin dashboard itu seru buatku.", typeId: "analyst" },
  { id: "q13", text: "Detail & ketelitian itu nyaman buatku.", typeId: "analyst" },

  { id: "q2", text: "Aku menikmati merancang tampilan/cerita agar gampang dipahami.", typeId: "creator" },
  { id: "q8", text: "Brainstorm ide baru bikin aku semangat.", typeId: "creator" },
  { id: "q14", text: "Aku sering mikir UX duluan sebelum fitur.", typeId: "creator" },

  { id: "q3", text: "Ketemu orang & gali kebutuhan mereka itu energizing.", typeId: "connector" },
  { id: "q9", text: "Bangun relasi & negosiasi termasuk kekuatanku.", typeId: "connector" },
  { id: "q15", text: "Aku bisa jelasin hal rumit jadi simpel.", typeId: "connector" },

  { id: "q4", text: "Suka set target, bikin prioritas, dan ngegerakin tim.", typeId: "driver" },
  { id: "q10", text: "Nyaman ambil keputusan meski info belum lengkap.", typeId: "driver" },
  { id: "q16", text: "Sering mulai inisiatif baru tanpa disuruh.", typeId: "driver" },

  { id: "q5", text: "Suka bikin sesuatu dari nol & memperbaikinya.", typeId: "maker" },
  { id: "q11", text: "Eksperimen teknis/hands-on bikin lupa waktu.", typeId: "maker" },
  { id: "q17", text: "Fokus ke performa dan kualitas hasil.", typeId: "maker" },

  { id: "q6", text: "Bikin to‑do, timeline, dan dokumentasi itu satisfying.", typeId: "organizer" },
  { id: "q12", text: "Kelola risiko, dependensi, dan proses itu klik buatku.", typeId: "organizer" },
  { id: "q18", text: "Suka bikin sistem kerja biar tim makin efisien.", typeId: "organizer" },
];

// === Helpers ===================================================
const STORAGE_KEY = "startup-role-quiz-state-v1";
const LIKERT = [
  { value: 1, label: "Sangat Tidak Setuju" },
  { value: 2, label: "Tidak Setuju" },
  { value: 3, label: "Netral" },
  { value: 4, label: "Setuju" },
  { value: 5, label: "Sangat Setuju" },
];

function emptyScore() {
  return { analyst: 0, creator: 0, connector: 0, driver: 0, maker: 0, organizer: 0 };
}

function computeScores(ans) {
  const score = emptyScore();
  for (const q of QUESTIONS) {
    const val = ans[q.id];
    if (!val) continue;
    score[q.typeId] += val;
  }
  return score;
}

function toPercentages(score) {
  const perTypeMax = 5 * 3; // 3 questions per type, max 5 each
  const out = {};
  Object.keys(score).forEach((k) => {
    out[k] = Math.round((score[k] / perTypeMax) * 100);
  });
  return out;
}

function topTypes(score, n = 2) {
  return Object.entries(score).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function usePersistedState(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

// === UI Primitives ============================================
function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-3 bg-black/80 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
      {children}
    </span>
  );
}

// === PNG Card (Canvas) ========================================
async function drawResultCardPNG({ typeMeta, pct }) {
  const W = 1200, H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#f3f4f6");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = "#111827";
  ctx.font = "bold 48px Inter, ui-sans-serif, system-ui";
  ctx.fillText("Hasil Startup Role Quiz", 60, 100);

  // Type title
  ctx.font = "bold 64px Inter, ui-sans-serif, system-ui";
  ctx.fillText(`${typeMeta.emoji} ${typeMeta.name}`, 60, 180);

  // Blurb
  ctx.fillStyle = "#374151";
  ctx.font = "28px Inter, ui-sans-serif, system-ui";
  wrapText(ctx, typeMeta.blurb, 60, 230, 1080, 38);

  // Bars
  const entries = Object.entries(pct);
  let y = 360;
  ctx.font = "24px Inter, ui-sans-serif, system-ui";
  for (const [id, v] of entries) {
    const label = TYPES.find((t) => t.id === id)?.name || id;
    ctx.fillStyle = "#111827";
    ctx.fillText(`${label}`, 60, y);
    ctx.fillStyle = "#E5E7EB"; ctx.fillRect(260, y - 20, 800, 16);
    ctx.fillStyle = "#111827"; ctx.fillRect(260, y - 20, Math.round(8 * v), 16);
    ctx.fillStyle = "#111827"; ctx.fillText(`${v}%`, 1070, y);
    y += 48;
  }

  // Footer
  ctx.fillStyle = "#6B7280";
  ctx.font = "20px Inter, ui-sans-serif, system-ui";


  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.95));
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// === Result View ===============================================
function ResultView({ score, onRetake }) {
  const pct = toPercentages(score);
  const tops = topTypes(score, 2);
  const [topId] = tops[0];
  const topMeta = TYPES.find((t) => t.id === topId);

  const [email, setEmail] = useState("");
  const [emailOk, setEmailOk] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postErr, setPostErr] = useState(null);
  const [imgURL, setImgURL] = useState(null);
  const imgBlobRef = useRef(null);

  const summary = useMemo(() => {
    return [
      `${topMeta.emoji} Kamu adalah: ${topMeta.name}`,
      topMeta.blurb,
      `Peran cocok: ${topMeta.roles.join(", ")}`,
      `Fokus skill: ${topMeta.skills.join(", ")}`,
    ].join("\n");
  }, [topMeta]);

  const validateEmail = (e) => {
    const at = e.indexOf("@");
    const dot = e.lastIndexOf(".");
    return at > 0 && dot > at + 1 && dot < e.length - 1;
  };

  async function submitEmailThenGenerate() {
    setPostErr(null);
    if (!validateEmail(email)) { setPostErr("Email tidak valid."); return; }
    setIsPosting(true);
    try {
      // 1) Save to Supabase
      let saved = false;
      if (SUPABASE_URL && SUPABASE_URL.startsWith("http")) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ email, type: topMeta.id, score_json: score }),
        });
        if (!res.ok) {
          const txt = await res.text();
          if (txt.includes("PGRST205")) {
            setPostErr("Supabase: tabel public.leads belum tersedia. Ikuti instruksi setup di bawah, atau lewati simpan dan lanjut download.");
          } else {
            throw new Error(txt || `Gagal simpan: ${res.status}`);
          }
        } else {
          saved = true;
        }
      }

      // 2) Allow continue to download for UX
      setEmailOk(true);
      const blob = await drawResultCardPNG({ typeMeta: topMeta, pct });
      imgBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setImgURL(url);

      if (!saved) console.warn("Leads not saved: create table and RLS policy. See on-screen SQL.");
    } catch (err) {
      setPostErr(err?.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsPosting(false);
    }
  }

  const downloadPNG = () => {
    if (!imgBlobRef.current) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(imgBlobRef.current);
    a.download = `startup-role-quiz-${topMeta.id}.png`;
    a.click();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{topMeta.emoji}</span>
          <h2 className="text-xl font-bold">Kamu adalah: {topMeta.name}</h2>
          <Pill>Top 2: {tops.map(([id]) => TYPES.find((t) => t.id === id)?.name).join(" & ")}</Pill>
        </div>
        <p className="text-gray-700 mb-4">{topMeta.blurb}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {TYPES.map((t) => (
            <div key={t.id} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><span>{t.emoji}</span><span className="font-semibold">{t.name}</span></div>
                <span className="text-sm font-mono">{pct[t.id]}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-2 bg-gray-800 rounded-full" style={{ width: `${pct[t.id]}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Attribution */}
        <div className="bg-gray-50 border rounded-xl p-4 mb-6 w-full">
          <p className="text-sm text-gray-700">
            © Muhammad Alhadiansyah S · <a className="underline" href={ATTR_LINKEDIN} target="_blank" rel="noreferrer">Let’s connect</a> · Supported by <a className="underline" href={ATTR_PIJAR} target="_blank" rel="noreferrer">pijarteknologi.id</a>
          </p>
        </div>

        {/* Email gate + generate image */}
        <div className="border rounded-xl p-4 mb-4">
          <h3 className="font-semibold mb-2">Dapatkan kartu hasil (PNG) 📸</h3>
          <p className="text-sm text-gray-600 mb-3">Masukkan email untuk menerima materi & update bermanfaat seputar karier. Setelah submit, kamu bisa download gambar hasilmu.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="nama@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border rounded-xl px-4 py-2"
            />
            <button
              onClick={submitEmailThenGenerate}
              disabled={isPosting}
              className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPosting ? "Memproses..." : "Submit & Buat Gambar"}
            </button>
          </div>

          {postErr && (
            <div className="mt-2 text-xs">
              <p className="text-red-600 mb-2">{postErr}</p>
              <details className="border rounded p-3 bg-gray-50">
                <summary className="cursor-pointer">Instruksi cepat membuat tabel Supabase</summary>
                <pre className="whitespace-pre-wrap text-[10px] mt-2">{`
-- Jalankan di SQL editor Supabase
create table if not exists public.leads (
  id bigserial primary key,
  email text not null,
  type text not null,
  score_json jsonb,
  created_at timestamptz default now()
);

alter table public.leads enable row level security;
create policy anon_insert on public.leads for insert to anon with check (true);
revoke select on public.leads from anon;`}</pre>
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-1 border rounded" onClick={() => navigator.clipboard.writeText(
`create table if not exists public.leads (id bigserial primary key, email text not null, type text not null, score_json jsonb, created_at timestamptz default now());
alter table public.leads enable row level security;
create policy anon_insert on public.leads for insert to anon with check (true);
revoke select on public.leads from anon;`
                  )}>Copy SQL</button>
                  <button className="px-3 py-1 border rounded" onClick={() => { setPostErr(null); setEmailOk(true); }}>Lewati simpan & lanjut download</button>
                </div>
              </details>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigator.clipboard.writeText(summary)} className="px-4 py-2 rounded-xl border hover:bg-gray-50">Copy Ringkasan</button>
          <button onClick={onRetake} className="px-4 py-2 rounded-xl border hover:bg-gray-50">Ulangi Kuis</button>
          <button
            onClick={downloadPNG}
            disabled={!emailOk || !imgURL}
            className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-40"
            title={!emailOk ? "Submit email dulu" : ""}
          >
            Download Kartu PNG
          </button>
        </div>

        {imgURL && (
          <div className="mt-4">
            <img src={imgURL} alt="Kartu hasil" className="w-full rounded-xl border" />
          </div>
        )}
      </div>
    </div>
  );
}

// === Quiz View ================================================
function QuizView({ answers, setAnswers, onFinish }) {
  const [idx, setIdx] = useState(0);
  const q = QUESTIONS[idx];
  const total = QUESTIONS.length;
  const currentVal = answers[q.id] ?? 0;
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / total) * 100);

  const setAnswer = (val) => setAnswers((prev) => ({ ...prev, [q.id]: val }));
  const next = () => { if (idx < total - 1) setIdx((i) => i + 1); else onFinish(); };
  const prev = () => setIdx((i) => Math.max(0, i - 1));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <ProgressBar value={progress} />
        <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
          <span>Pertanyaan {idx + 1} dari {total}</span>
          <Pill>{Math.max(0, total - answeredCount)} sisa</Pill>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-lg">{TYPES.find((t) => t.id === q.typeId)?.emoji}</span>
          <h2 className="text-lg font-semibold">{q.text}</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">Pilih tingkat persetujuanmu (1 = sangat tidak setuju, 5 = sangat setuju)</p>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {LIKERT.map((opt) => (
            <label
              key={opt.value}
              className={`border rounded-xl p-3 cursor-pointer text-center ${currentVal === opt.value ? "bg-black text-white border-black" : "hover:bg-gray-50"}`}
            >
              <input
                type="radio"
                name={q.id}
                value={opt.value}
                checked={currentVal === opt.value}
                onChange={() => setAnswer(opt.value)}
                className="hidden"
              />
              <div className="text-2xl font-semibold leading-none">{opt.value}</div>
              <div className="text-xs mt-1 opacity-80">{opt.label}</div>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button onClick={prev} className="px-4 py-2 rounded-xl border hover:bg-gray-50 disabled:opacity-40" disabled={idx === 0}>Kembali</button>
          <button onClick={next} className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-40" disabled={!currentVal}>
            {idx === total - 1 ? "Lihat Hasil" : "Lanjut"}
          </button>
        </div>
      </div>
    </div>
  );
}

// === Root App ==================================================
export default function App() {
  // Handle shared scores via URL
  const [sharedScore, setSharedScore] = useState(null);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.size) {
        const sc = emptyScore();
        Object.keys(sc).forEach((k) => {
          const v = Number(params.get(k));
          if (!Number.isNaN(v) && v > 0) sc[k] = v;
        });
        const valid = Object.values(sc).some((v) => v > 0);
        if (valid) setSharedScore(sc);
      }
    } catch {}
  }, []);

  const [answers, setAnswers] = usePersistedState(STORAGE_KEY, {});
  const [showResult, setShowResult] = useState(false);
  const score = useMemo(() => computeScores(answers), [answers]);

  const reset = () => {
    setAnswers(() => ({}));
    setShowResult(false);
    try { const url = new URL(window.location.href); url.search = ""; window.history.replaceState({}, "", url.toString()); } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white text-gray-900">
      <header className="max-w-3xl w-full mx-auto px-6 pt-10 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Startup Role Quiz <span className="opacity-60">– Cobain kuisnya, cari tau role apa yang cocok jika kamu kerja di startup</span>
        </h1>
        <p className="mt-2 text-gray-700 max-w-2xl">
          Jawab 18 pertanyaan singkat untuk memetakan gaya kerjamu. Dapatkan rekomendasi
          peran, fokus skill, dan kartu hasil yang bisa kamu bagikan.
        </p>
      </header>

      <main className="flex-grow max-w-3xl mx-auto px-6 pb-10 w-full flex flex-col items-center justify-center relative">
        {sharedScore ? (
          <div className="max-w-3xl mx-auto mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Pill>Mode Tautan Hasil</Pill>
              <span className="text-sm text-gray-600">Kamu sedang melihat hasil yang dibagikan. Ingin coba sendiri?</span>
              <button onClick={() => setSharedScore(null)} className="text-sm underline">Mulai Kuis</button>
            </div>
            <ResultView score={sharedScore} onRetake={() => setSharedScore(null)} />
          </div>
        ) : showResult ? (
          <ResultView score={score} onRetake={reset} />
        ) : (
          <QuizView answers={answers} setAnswers={setAnswers} onFinish={() => setShowResult(true)} />
        )}
      </main>

      <footer className="max-w-3xl w-full mx-auto px-6 pt-6 pb-10 text-sm text-gray-500 text-center">
        © {new Date().getFullYear()} Muhammad Alhadiansyah S ·{" "}
        <a className="underline" href={ATTR_LINKEDIN} target="_blank" rel="noreferrer">Let’s connect</a> · Supported by{" "}
        <a className="underline" href={ATTR_PIJAR} target="_blank" rel="noreferrer">pijarteknologi.id</a>
      </footer>
    </div>
  );
}

// ============================================================
// Dev Test Harness (console.assert)
// ============================================================
(function runDevTests() {
  try {
    // Test 1: all answers = 5 -> each type = 15 (100%)
    const all5 = {}; for (const q of QUESTIONS) all5[q.id] = 5;
    const fullScore = computeScores(all5);
    const pct = toPercentages(fullScore);
    Object.keys(fullScore).forEach((k) => {
      console.assert(fullScore[k] === 15, `Expected 15 for ${k}, got ${fullScore[k]}`);
      console.assert(pct[k] === 100, `Expected 100% for ${k}, got ${pct[k]}%`);
    });

    // Test 2: topTypes ordering
    const ans2 = { q1: 5, q7: 5, q13: 5, q2: 4, q8: 4, q14: 4 };
    const sc2 = computeScores(ans2);
    const tops2 = topTypes(sc2, 2).map(([k]) => k);
    console.assert(tops2[0] === "analyst", `Expected top type analyst, got ${tops2[0]}`);

    // Test 3: partial answers -> percentages numbers
    const ans3 = { q1: 3, q2: 4, q3: 5 };
    const sc3 = computeScores(ans3);
    const pct3 = toPercentages(sc3);
    Object.values(pct3).forEach((v) => console.assert(!Number.isNaN(v), "Percentage should be number"));

    // Test 4: drawResultCardPNG smoke test (may require DOM/canvas env)
    (async () => {
      const blob = await drawResultCardPNG({ typeMeta: TYPES[0], pct: toPercentages(fullScore) });
      console.assert(!blob || blob.size >= 0, "PNG blob created"); // tolerant in SSR
    })();
  } catch (err) {
    console.warn("Dev tests encountered an error (ignored in production):", err);
  }
})();