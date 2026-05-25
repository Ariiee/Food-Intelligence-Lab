"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, FlaskConical, ShieldAlert, TrendingUp, BarChart3, History, 
  User, UploadCloud, CheckCircle, AlertTriangle, Play, HelpCircle, Download
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  LineChart, Line, CartesianGrid, Legend, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from "recharts";
import TiltCard from "../../components/TiltCard";

const ThreeDScanner = dynamic(() => import("../../components/ThreeDScanner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center font-mono text-xs text-on-surface-variant">
      Initializing 3D scanner…
    </div>
  ),
});
import ChartWrapper from "../../components/ChartWrapper";
import { getApiBase } from "../../lib/api";
import { formatScanDate, formatScanTime } from "../../lib/format-date";
import {
  buildLocalScanResult,
  createMockArchiveScans,
  matchFoodPreset,
  presetToFormValues,
  resolveFoodPreset,
} from "../../lib/food-profiles";
import { downloadScanReportPdf } from "../../lib/generate-report-pdf";
import {
  formatIndexValue,
  indexBarPercent,
  MINERAL_INDEX_MAX,
  VITAMIN_INDEX_MAX,
} from "../../lib/nutrition-metrics";
import { LeadRiskBadgeFromInfo } from "../../components/LeadRiskBadge";
import LeadRiskLegend from "../../components/LeadRiskLegend";
import {
  resolveSafetyGrade,
  getWorstContaminant,
  getMetalRiskBySymbol,
  metalBarPercentBySymbol,
  METAL_LIMITS,
  type MetalSymbol,
} from "../../lib/lead-risk";
import { computeSafetyScore } from "../../lib/safety-score";

const CATEGORIES = ["Grain", "Fruit", "Vegetable", "Meat", "Seafood", "Dairy", "Legume", "Beverage"];
const MODELS = ["Random Forest", "Decision Tree", "SVM", "Neural Network"];

const MOCK_HISTORICAL_SCANS = createMockArchiveScans();

const MOCK_MODEL_METRICS = [
  { model_name: "Random Forest", accuracy: 0.992, precision: 0.990, recall: 0.992, f1_score: 0.991, latency_ms: 2.4, training_time_s: 1.25 },
  { model_name: "Decision Tree", accuracy: 0.965, precision: 0.964, recall: 0.965, f1_score: 0.964, latency_ms: 0.8, training_time_s: 0.32 },
  { model_name: "SVM", accuracy: 0.978, precision: 0.977, recall: 0.978, f1_score: 0.977, latency_ms: 12.6, training_time_s: 4.80 },
  { model_name: "Neural Network", accuracy: 0.985, precision: 0.984, recall: 0.985, f1_score: 0.984, latency_ms: 4.2, training_time_s: 8.90 }
];

const MOCK_FEATURE_IMPORTANCES = {
  n_pct: 0.38,
  c_pct: 0.22,
  o_pct: 0.14,
  h_pct: 0.08,
  ca_pct: 0.06,
  mg_pct: 0.05,
  p_pct: 0.03,
  k_pct: 0.02,
  na_pct: 0.02
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("scanner"); // scanner, report, models, archives
  const [modelName, setModelName] = useState("Random Forest");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [apiOnline, setApiOnline] = useState(false);

  // Form Inputs
  const [sampleName, setSampleName] = useState("Hydroponic Lettuce v4");
  const [category, setCategory] = useState("Vegetable");
  const [cPct, setCPct] = useState(38.2);
  const [hPct, setHPct] = useState(6.1);
  const [oPct, setOPct] = useState(52.8);
  const [nPct, setNPct] = useState(0.85);
  const [pPct, setPPct] = useState(0.18);
  const [caPct, setCaPct] = useState(0.14);
  const [mgPct, setMgPct] = useState(0.09);
  const [kPct, setKPct] = useState(0.38);
  const [naPct, setNaPct] = useState(0.025);
  const [tracePb, setTracePb] = useState(0.008);
  const [traceCd, setTraceCd] = useState(0.002);
  const [traceHg, setTraceHg] = useState(0.0004);
  const [traceAs, setTraceAs] = useState(0.005);

  // Result state (starts with high-fidelity mock, loads from API if online)
  const [currentResult, setCurrentResult] = useState<any>(MOCK_HISTORICAL_SCANS[0]);
  const [historicalScans, setHistoricalScans] = useState<any[]>(MOCK_HISTORICAL_SCANS);
  const [modelMetrics, setModelMetrics] = useState<any[]>(MOCK_MODEL_METRICS);
  const [featureImportances, setFeatureImportances] = useState<any>(MOCK_FEATURE_IMPORTANCES);

  // CSV file drag and drop upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSummary, setUploadSummary] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  const API_BASE = getApiBase();

  // Auto-fill category + elemental signature when sample name matches a known food
  useEffect(() => {
    const preset = matchFoodPreset(sampleName);
    if (!preset) return;
    const form = presetToFormValues(preset);
    setCategory(form.category);
    setCPct(form.cPct);
    setHPct(form.hPct);
    setOPct(form.oPct);
    setNPct(form.nPct);
    setPPct(form.pPct);
    setCaPct(form.caPct);
    setMgPct(form.mgPct);
    setKPct(form.kPct);
    setNaPct(form.naPct);
    setTracePb(form.tracePb);
    setTraceCd(form.traceCd);
    setTraceHg(form.traceHg);
    setTraceAs(form.traceAs);
  }, [sampleName]);

  // Probe API connection
  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/health`);
        if (res.ok) {
          const data = await res.json();
          setApiOnline(true);
          console.log("[SYSTEM] Connected to live NEURAL_LAB API. Health:", data);
          fetchMetrics();
          fetchHistory();
          fetchImportances();
        } else {
          setApiOnline(false);
        }
      } catch (err) {
        setApiOnline(false);
        console.log("[SYSTEM] FastAPI server not detected. Operating in High-Fidelity Local Standalone Mode.");
      }
    };
    checkApi();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/models/metrics`);
      if (res.ok) {
        const data = await res.json();
        setModelMetrics(data);
      }
    } catch (err) {}
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analysis/history`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setHistoricalScans(data);
      }
    } catch (err) {}
  };

  const fetchImportances = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/models/feature-importance`);
      if (res.ok) {
        const data = await res.json();
        setFeatureImportances(data);
      }
    } catch (err) {}
  };

  // Run Animated Spectrometry Scan
  const handleStartScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanLogs([]);

    const logMessages = [
      "INITIATING SPECTRUM EMISSION NODE_04...",
      "CALIBRATING LASER FIELD INTERFEROMETERS...",
      "LOCKING ATOMIC COORD GRID (C_H_O)...",
      "PARSING SPECTRAL PEAKS FOR ORGANIC RATIOS...",
      "RUNNING LIVE INFERENCE ENGINE (SVM_MLP)...",
      "CALCULATING BIO-INTEGRITY QUALITY INDEX...",
      "SCAN COMPLETED SUCCESSFULLY. STREAMING VALUES."
    ];

    let currentStep = 0;
    const interval = setInterval(async () => {
      currentStep += 1;
      setScanProgress((prev) => Math.min(100, prev + 15));
      if (currentStep <= logMessages.length) {
        setScanLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${logMessages[currentStep - 1]}`]);
      }

      if (currentStep >= logMessages.length + 1) {
        clearInterval(interval);
        
        // Form payload
        const payload = {
          name: sampleName,
          category: category,
          c_pct: cPct,
          h_pct: hPct,
          o_pct: oPct,
          n_pct: nPct,
          p_pct: pPct,
          ca_pct: caPct,
          mg_pct: mgPct,
          k_pct: kPct,
          na_pct: naPct,
          trace_pb: tracePb,
          trace_cd: traceCd,
          trace_hg: traceHg,
          trace_as: traceAs
        };

        if (apiOnline) {
          try {
            const res = await fetch(`${API_BASE}/api/analysis/scan?model_name=${encodeURIComponent(modelName)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            if (res.ok) {
              const data = await res.json();
              setCurrentResult(data);
              setHistoricalScans((prev) => [data, ...prev]);
            }
          } catch (err) {
            console.error("Scan API error", err);
          }
        } else {
          const newScan = buildLocalScanResult(payload);
          setCurrentResult(newScan);
          setHistoricalScans((prev) => [newScan, ...prev]);
        }

        setIsScanning(false);
        setActiveTab("report"); // Switch to report after scan completes!
      }
    }, 450);
  };

  // CSV batch file upload handler
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadSummary(null);

    if (apiOnline) {
      try {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("model_name", modelName);

        const res = await fetch(`${API_BASE}/api/analysis/upload`, {
          method: "POST",
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          setUploadSummary(data.summary);
          fetchHistory();
        } else {
          const errData = await res.json();
          alert(errData.detail || "Error processing file upload.");
        }
      } catch (err) {
        alert("Server communication error.");
      }
    } else {
      // Local standalone mock upload handler
      setTimeout(() => {
        setUploadSummary({
          total_records: 8,
          premium_count: 3,
          standard_count: 3,
          poor_count: 2,
          safe_count: 6,
          danger_count: 2,
          avg_confidence: 0.945
        });
        
        const batchNames = ["Batch Tuna", "Batch Chicken Breast", "Batch Spinach", "Batch Red Wine"];
        const mockBatchScans = batchNames.map((name) => {
          const preset = resolveFoodPreset(name, category);
          return buildLocalScanResult({
            name,
            category: preset.category,
            c_pct: preset.c_pct,
            h_pct: preset.h_pct,
            o_pct: preset.o_pct,
            n_pct: preset.n_pct,
            p_pct: preset.p_pct,
            ca_pct: preset.ca_pct,
            mg_pct: preset.mg_pct,
            k_pct: preset.k_pct,
            na_pct: preset.na_pct,
            trace_pb: preset.trace_pb,
            trace_cd: preset.trace_cd,
            trace_hg: preset.trace_hg,
            trace_as: preset.trace_as,
          });
        });
        setHistoricalScans((prev) => [...mockBatchScans, ...prev]);
      }, 1500);
    }
    setUploading(false);
  };

  // Recharts Chart Formatted Data
  const handleDownloadReportPdf = () => {
    downloadScanReportPdf(currentResult);
  };

  const safetyRisk = resolveSafetyGrade(currentResult);
  const worstMetal = getWorstContaminant(
    currentResult.trace_pb ?? 0,
    currentResult.trace_cd ?? 0,
    currentResult.trace_hg ?? 0,
    currentResult.trace_as ?? 0
  );
  const safetyScore = computeSafetyScore(
    currentResult.trace_pb ?? 0,
    currentResult.trace_cd,
    currentResult.trace_hg,
    currentResult.trace_as,
    currentResult.toxicity_grade
  );

  const mineralChartData = [
    { name: "Phosphorus (P)", value: parseFloat(currentResult.p_pct.toFixed(2)) },
    { name: "Calcium (Ca)", value: parseFloat(currentResult.ca_pct.toFixed(2)) },
    { name: "Magnesium (Mg)", value: parseFloat(currentResult.mg_pct.toFixed(2)) },
    { name: "Potassium (K)", value: parseFloat(currentResult.k_pct.toFixed(2)) },
    { name: "Sodium (Na)", value: parseFloat(currentResult.na_pct.toFixed(2)) }
  ];

  const modelAccuracyData = modelMetrics.map((m) => ({
    name: m.model_name,
    Accuracy: parseFloat((m.accuracy * 100).toFixed(1)),
    Latency: m.latency_ms
  }));

  // SVG pulsing neural network nodes coordinate calculations
  const [svgMouse, setSvgMouse] = useState({ x: 0, y: 0 });
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSvgMouse({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div className="min-h-screen mesh-gradient-bg flex flex-col font-sans text-white">
      {/* 1. Header Toolbar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-12 py-3 bg-surface-charcoal/60 backdrop-blur-xl border-b border-white/8 shadow-2xl">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:bg-white/5 p-2 rounded-full transition-all">
            <ArrowLeft className="w-4 h-4 text-on-surface-variant" />
          </Link>
          <div>
            <div className="font-mono text-xs tracking-[0.25em] text-accent-cyan font-bold uppercase">
              SpectroFood Analytics
            </div>
            <div className="font-mono text-[8px] text-on-surface-variant/70 tracking-wider hidden sm:block">
              Industrial food safety &amp; nutrition intelligence
            </div>
          </div>
        </div>

        {/* API connection status pill */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
            apiOnline 
              ? "border-accent-green/20 bg-accent-green/5 text-accent-green" 
              : "border-accent-orange/20 bg-accent-orange/5 text-accent-orange"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${apiOnline ? "bg-accent-green animate-pulse" : "bg-accent-orange"}`}></span>
            <span className="font-mono text-[9px] tracking-wider uppercase font-semibold">
              {apiOnline ? "Lab Server Online" : "Local Simulator Mode"}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Main Dashboard Panel Grid */}
      <div className="flex-1 flex flex-col lg:flex-row pt-20 px-4 md:px-12 pb-32 gap-6 max-w-[1550px] mx-auto w-full">
        {/* Left Navigation Menu (Glassmorphism vertical dock) */}
        <aside className="lg:w-[260px] flex-shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          <button 
            onClick={() => setActiveTab("scanner")}
            className={`w-full text-left px-5 py-4 rounded-xl font-mono text-xs tracking-wider flex items-center gap-3 border transition-all ${
              activeTab === "scanner" 
                ? "bg-accent-cyan/10 border-accent-cyan text-accent-cyan glow-cyan" 
                : "glass-panel border-white/5 text-on-surface-variant hover:bg-white/5 hover:text-white"
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            SCANNER TERMINAL
          </button>
          
          <button 
            onClick={() => setActiveTab("report")}
            className={`w-full text-left px-5 py-4 rounded-xl font-mono text-xs tracking-wider flex items-center gap-3 border transition-all ${
              activeTab === "report" 
                ? "bg-accent-green/10 border-accent-green text-accent-green glow-green" 
                : "glass-panel border-white/5 text-on-surface-variant hover:bg-white/5 hover:text-white"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            NUTRITIONAL REPORT
          </button>

          <button 
            onClick={() => setActiveTab("models")}
            className={`w-full text-left px-5 py-4 rounded-xl font-mono text-xs tracking-wider flex items-center gap-3 border transition-all ${
              activeTab === "models" 
                ? "bg-accent-cyan/10 border-accent-cyan text-accent-cyan glow-cyan" 
                : "glass-panel border-white/5 text-on-surface-variant hover:bg-white/5 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            ML MODEL ENGINE
          </button>

          <button 
            onClick={() => setActiveTab("archives")}
            className={`w-full text-left px-5 py-4 rounded-xl font-mono text-xs tracking-wider flex items-center gap-3 border transition-all ${
              activeTab === "archives" 
                ? "bg-white/8 border-white/30 text-white" 
                : "glass-panel border-white/5 text-on-surface-variant hover:bg-white/5 hover:text-white"
            }`}
          >
            <History className="w-4 h-4" />
            SCAN ARCHIVES
          </button>

        </aside>

        {/* Right Tab Content Viewer (Glassmorphic modules) */}
        <section className="flex-1 flex flex-col gap-6 min-w-0">
          <AnimatePresence mode="wait">
            {/* TAB 1: SCANNER TERMINAL */}
            {activeTab === "scanner" && (
              <motion.div 
                key="scanner"
                initial={{ opacity: 0, y: 20, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -20, rotateX: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="grid grid-cols-1 xl:grid-cols-12 gap-6"
              >
              
              {/* Manual Spectroscopy Parameter Inputs */}
              <div className="xl:col-span-7 glass-panel p-6 rounded-[24px] flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight text-white uppercase mb-1">
                      Spectrometry Calibration Terminal
                    </h2>
                    <p className="font-body text-xs text-on-surface-variant/80">
                      Configure elemental fractions to generate simulated spectroscopy profiles.
                    </p>
                  </div>

                  {/* Input form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] text-accent-cyan tracking-wider uppercase font-semibold">Sample Name</label>
                      <input 
                        type="text" 
                        value={sampleName} 
                        onChange={(e) => setSampleName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-cyan outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] text-accent-cyan tracking-wider uppercase font-semibold">Food Category</label>
                      <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono focus:border-accent-cyan outline-none"
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="w-full h-[1px] bg-white/5"></div>

                  {/* Organic elements sliders */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] text-white/80 font-bold uppercase">Organic Elements Fraction (%)</span>
                      <span className="font-mono text-[9px] text-accent-cyan">
                        Total Organic: {(cPct + hPct + oPct + nPct).toFixed(2)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Carbon */}
                      <div className="space-y-1.5 glass-panel p-3 rounded-lg border-white/5">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span>Carbon (C)</span>
                          <span className="text-accent-green">{cPct}%</span>
                        </div>
                        <input 
                          type="range" min="20" max="70" step="0.1" value={cPct} 
                          onChange={(e) => setCPct(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-green"
                        />
                      </div>
                      
                      {/* Oxygen */}
                      <div className="space-y-1.5 glass-panel p-3 rounded-lg border-white/5">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span>Oxygen (O)</span>
                          <span className="text-accent-green">{oPct}%</span>
                        </div>
                        <input 
                          type="range" min="15" max="65" step="0.1" value={oPct} 
                          onChange={(e) => setOPct(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-green"
                        />
                      </div>

                      {/* Hydrogen */}
                      <div className="space-y-1.5 glass-panel p-3 rounded-lg border-white/5">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span>Hydrogen (H)</span>
                          <span className="text-accent-green">{hPct}%</span>
                        </div>
                        <input 
                          type="range" min="2" max="15" step="0.1" value={hPct} 
                          onChange={(e) => setHPct(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-green"
                        />
                      </div>

                      {/* Nitrogen */}
                      <div className="space-y-1.5 glass-panel p-3 rounded-lg border-white/5">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span>Nitrogen (N)</span>
                          <span className="text-accent-green">{nPct}%</span>
                        </div>
                        <input 
                          type="range" min="0.05" max="6" step="0.05" value={nPct} 
                          onChange={(e) => setNPct(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-green"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mineral elements input block */}
                  <div className="space-y-3">
                    <span className="font-mono text-[10px] text-white/80 font-bold uppercase block">Mineral Ash Traces (%)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 glass-panel border-white/5 rounded-lg text-center">
                        <div className="text-[9px] font-mono text-on-surface-variant uppercase mb-1">Phosphorus</div>
                        <input 
                          type="number" step="0.01" value={pPct} onChange={(e) => setPPct(parseFloat(e.target.value))}
                          className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-center font-mono text-[10px] outline-none"
                        />
                      </div>
                      <div className="p-2 glass-panel border-white/5 rounded-lg text-center">
                        <div className="text-[9px] font-mono text-on-surface-variant uppercase mb-1">Calcium</div>
                        <input 
                          type="number" step="0.01" value={caPct} onChange={(e) => setCaPct(parseFloat(e.target.value))}
                          className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-center font-mono text-[10px] outline-none"
                        />
                      </div>
                      <div className="p-2 glass-panel border-white/5 rounded-lg text-center">
                        <div className="text-[9px] font-mono text-on-surface-variant uppercase mb-1">Magnesium</div>
                        <input 
                          type="number" step="0.01" value={mgPct} onChange={(e) => setMgPct(parseFloat(e.target.value))}
                          className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-center font-mono text-[10px] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Heavy Metal Toxins block */}
                  <div className="space-y-3">
                    <span className="font-mono text-[10px] text-accent-orange font-bold uppercase block">Heavy Metal Pollutants (ppm)</span>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2 glass-panel border-accent-orange/10 rounded-lg text-center">
                        <div className="text-[8px] font-mono text-accent-orange uppercase mb-1">Lead (Pb)</div>
                        <input 
                          type="number" step="0.001" value={tracePb} onChange={(e) => setTracePb(parseFloat(e.target.value))}
                          className="w-full bg-black/40 border border-white/5 rounded px-1.5 py-1 text-center font-mono text-[10px] outline-none"
                        />
                      </div>
                      <div className="p-2 glass-panel border-accent-orange/10 rounded-lg text-center">
                        <div className="text-[8px] font-mono text-accent-orange uppercase mb-1">Cadmium (Cd)</div>
                        <input 
                          type="number" step="0.001" value={traceCd} onChange={(e) => setTraceCd(parseFloat(e.target.value))}
                          className="w-full bg-black/40 border border-white/5 rounded px-1.5 py-1 text-center font-mono text-[10px] outline-none"
                        />
                      </div>
                      <div className="p-2 glass-panel border-accent-orange/10 rounded-lg text-center">
                        <div className="text-[8px] font-mono text-accent-orange uppercase mb-1">Mercury (Hg)</div>
                        <input 
                          type="number" step="0.0001" value={traceHg} onChange={(e) => setTraceHg(parseFloat(e.target.value))}
                          className="w-full bg-black/40 border border-white/5 rounded px-1.5 py-1 text-center font-mono text-[10px] outline-none"
                        />
                      </div>
                      <div className="p-2 glass-panel border-accent-orange/10 rounded-lg text-center">
                        <div className="text-[8px] font-mono text-accent-orange uppercase mb-1">Arsenic (As)</div>
                        <input 
                          type="number" step="0.001" value={traceAs} onChange={(e) => setTraceAs(parseFloat(e.target.value))}
                          className="w-full bg-black/40 border border-white/5 rounded px-1.5 py-1 text-center font-mono text-[10px] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scan Execution & Model Select */}
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <div className="flex-1 space-y-1">
                    <label className="font-mono text-[9px] text-on-surface-variant uppercase block">Selected Machine Learning Classifier</label>
                    <select 
                      value={modelName} onChange={(e) => setModelName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-3.5 text-xs font-mono focus:border-accent-cyan outline-none"
                    >
                      {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <button
                    onClick={handleStartScan}
                    disabled={isScanning}
                    className="px-8 py-3.5 bg-accent-cyan text-black font-mono text-xs font-bold rounded-lg flex items-center justify-center gap-3 glow-cyan active:scale-95 duration-100 mt-5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {isScanning ? "ACQUIRING..." : "ACQUIRE SPECTRA"}
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dynamic 3D WebGL scanner visualizer */}
              <div className="xl:col-span-5 flex flex-col gap-6">
                <div className="glass-panel p-6 rounded-[24px] relative overflow-hidden flex-1 min-h-[380px] flex flex-col justify-between">
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10"></div>
                  
                  {isScanning && <div className="scan-line z-20"></div>}
                  
                  <div className="relative w-full h-full min-h-[280px]">
                    <ThreeDScanner category={category} isScanning={isScanning} />
                  </div>

                  <div className="relative z-20 space-y-2 border-t border-white/5 pt-4">
                    <div className="flex justify-between items-center text-xs font-mono text-on-surface-variant">
                      <span>Spectroscopy Matrix Lock</span>
                      <span>{isScanning ? `${scanProgress}%` : "READY"}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent-cyan transition-all duration-300"
                        style={{ width: `${isScanning ? scanProgress : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Console Log readout window */}
                <div className="glass-panel p-4 rounded-xl border-white/5 h-[140px] overflow-y-auto font-mono text-[9px] text-accent-green space-y-1 scrollbar-thin">
                  {scanLogs.length === 0 ? (
                    <div className="opacity-40 text-center pt-8 uppercase">Awaiting spectrum emission trigger...</div>
                  ) : (
                    scanLogs.map((log, idx) => <div key={idx}>{log}</div>)
                  )}
                </div>
              </div>

              {/* Batch Upload Area */}
              <div className="xl:col-span-12 glass-panel p-6 rounded-[24px]">
                <h2 className="font-display text-xl font-bold tracking-tight text-white uppercase mb-4">
                  Multi-Sample Dataset Drag-&-Drop
                </h2>
                
                <form onSubmit={handleFileUpload} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-8 border border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center bg-black/20 hover:bg-black/30 transition-all relative">
                    <UploadCloud className="w-8 h-8 text-on-surface-variant mb-2 animate-bounce" />
                    <span className="font-mono text-xs text-white/80">Drag and drop elemental spreadsheet (CSV, Excel)</span>
                    <span className="font-mono text-[10px] text-on-surface-variant mt-1">Header required: name, category, c_pct, h_pct, o_pct...</span>
                    
                    <input 
                      type="file" accept=".csv, .xlsx, .xls"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    {uploadFile && (
                      <div className="mt-3 px-3 py-1 bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan rounded text-[10px] font-mono">
                        SELECTED FILE: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-4 space-y-4">
                    <button 
                      type="submit" disabled={!uploadFile || uploading}
                      className="w-full py-4 bg-accent-green text-black font-mono text-xs font-bold rounded-lg glow-green flex items-center justify-center gap-3 active:scale-95 duration-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      {uploading ? "PARSING BATCH..." : "COMPILE DATASET"}
                    </button>

                    {uploadSummary && (
                      <div className="glass-panel p-4 rounded-lg border-accent-green/20 bg-accent-green/5 space-y-2 font-mono text-[10px] text-accent-green-dim">
                        <div className="font-bold text-accent-green text-xs">BATCH SCAN COMPLETED:</div>
                        <div>Total processed: {uploadSummary.total_records} files</div>
                        <div>Premium Grade: {uploadSummary.premium_count} | Poor Grade: {uploadSummary.poor_count}</div>
                        <div>Toxicity Alarms: {uploadSummary.danger_count} dangerous levels</div>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              </motion.div>
            )}

            {/* TAB 2: NUTRITIONAL REPORT */}
            {activeTab === "report" && (
              <motion.div 
                key="report"
                initial={{ opacity: 0, y: 20, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -20, rotateX: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
              
              <div className="glass-panel p-6 rounded-[24px]">
                <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4 mb-6">
                  <div>
                    <span className="font-mono text-[10px] text-accent-green font-bold">ANALYZED TARGET: {currentResult.name.toUpperCase()}</span>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-white uppercase">
                      Predicted Nutritional Fingerprint
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-3 font-mono text-[9px] text-on-surface-variant/90">
                      <span>Sample ID: <span className="text-accent-cyan">SF-{String(currentResult.id ?? "DRAFT").padStart(6, "0")}</span></span>
                      {currentResult.created_at && (
                        <span>
                          Analysis: {formatScanDate(currentResult.created_at)} {formatScanTime(currentResult.created_at)}
                        </span>
                      )}
                      <span>Method: ICP-MS spectrometry (simulated)</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="px-4 py-2 glass-panel rounded-lg border-white/8 font-mono text-xs">
                      Confidence: <span className="text-accent-green font-bold">{(currentResult.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadReportPdf}
                      className="px-4 py-2 glass-panel border-accent-cyan/30 text-accent-cyan font-mono text-xs rounded-lg hover:bg-accent-cyan/10 transition-all flex items-center gap-2 active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      DOWNLOAD PDF REPORT
                    </button>
                  </div>
                </div>

                {/* Macronutrient breakdown circles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Protein Ring */}
                  <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="72" cy="72" r="62" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                        <circle 
                          cx="72" cy="72" r="62" fill="transparent" stroke="#39ff14" strokeWidth="8" 
                          strokeDasharray="389.5"
                          strokeDashoffset={389.5 - (389.5 * currentResult.protein_pred) / 100}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="font-mono text-xl text-accent-green font-bold">{currentResult.protein_pred.toFixed(1)}%</span>
                        <span className="font-mono text-[9px] text-on-surface-variant uppercase">Protein</span>
                      </div>
                    </div>
                    <div className="mt-4 font-mono text-[10px] text-on-surface-variant">N-factor calibrated protein extract</div>
                  </div>

                  {/* Fats Ring */}
                  <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="72" cy="72" r="62" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                        <circle 
                          cx="72" cy="72" r="62" fill="transparent" stroke="#00f3ff" strokeWidth="8" 
                          strokeDasharray="389.5"
                          strokeDashoffset={389.5 - (389.5 * currentResult.fat_pred) / 100}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="font-mono text-xl text-accent-cyan font-bold">{currentResult.fat_pred.toFixed(1)}%</span>
                        <span className="font-mono text-[9px] text-on-surface-variant uppercase">Lipids / Fat</span>
                      </div>
                    </div>
                    <div className="mt-4 font-mono text-[10px] text-on-surface-variant">Organic lipid chain calibration</div>
                  </div>

                  {/* Carbs Ring */}
                  <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="72" cy="72" r="62" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                        <circle 
                          cx="72" cy="72" r="62" fill="transparent" stroke="#ff8c00" strokeWidth="8" 
                          strokeDasharray="389.5"
                          strokeDashoffset={389.5 - (389.5 * currentResult.carbs_pred) / 100}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="font-mono text-xl text-accent-orange font-bold">{currentResult.carbs_pred.toFixed(1)}%</span>
                        <span className="font-mono text-[9px] text-on-surface-variant uppercase">Carbohydrates</span>
                      </div>
                    </div>
                    <div className="mt-4 font-mono text-[10px] text-on-surface-variant">Carbon-hydrate molecule grid totals</div>
                  </div>

                </div>
              </div>

              {/* Micronutrients and Minerals charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Minerals Recharts Bar Chart */}
                <div className="lg:col-span-7 glass-panel p-6 rounded-[24px]">
                  <h3 className="font-display text-lg font-bold text-white uppercase mb-4">Mineral Spectrometry Breakdown</h3>
                  <div className="w-full h-[280px]">
                    <ChartWrapper>
                      <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mineralChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" stroke="#baccb0" fontSize={9} fontFamily="JetBrains Mono" />
                        <YAxis stroke="#baccb0" fontSize={9} fontFamily="JetBrains Mono" />
                        <Tooltip 
                          contentStyle={{ background: "rgba(13,13,13,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                          labelStyle={{ color: "#39ff14", fontSize: "10px", fontFamily: "JetBrains Mono" }}
                          itemStyle={{ fontSize: "11px", color: "#fff" }}
                        />
                        <Bar dataKey="value" fill="#00f3ff" radius={[4, 4, 0, 0]}>
                          {mineralChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#00f3ff" : "#39ff14"} />
                          ))}
                        </Bar>
                      </BarChart>
                      </ResponsiveContainer>
                    </ChartWrapper>
                  </div>
                </div>

                {/* Dry Weight Ash & Vitamin Density card */}
                <div className="lg:col-span-5 glass-panel p-6 rounded-[24px] flex flex-col justify-between">
                  <h3 className="font-display text-lg font-bold text-white uppercase mb-4">Dry Mass Ash Profiling</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span>Mineral Density Index</span>
                      <span className="text-accent-cyan font-bold">
                        {formatIndexValue(currentResult.minerals_pred, MINERAL_INDEX_MAX)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-cyan transition-all"
                        style={{ width: `${indexBarPercent(currentResult.minerals_pred, MINERAL_INDEX_MAX)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono mt-4">
                      <span>Vitamin Density Index</span>
                      <span className="text-accent-green font-bold">
                        {formatIndexValue(currentResult.vitamins_pred, VITAMIN_INDEX_MAX)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-green transition-all"
                        style={{ width: `${indexBarPercent(currentResult.vitamins_pred, VITAMIN_INDEX_MAX)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-white/5 pt-4 text-xs font-mono text-on-surface-variant/80">
                    <div>Spectrometric Ash Density correlates with organic cell mineral density. Estimations calibrated using USDA food classification targets.</div>
                  </div>
                </div>

              </div>

              {/* Premium separation bar */}
              <div className="border-t border-white/10 pt-8 mt-8">
                <h3 className="font-display text-lg font-bold text-accent-orange uppercase mb-4">
                  Heavy Metal Toxicity & Spectroscopy Safety Assessment
                </h3>
              </div>

              <LeadRiskLegend />

              {/* Contamination Alert status banner */}
              <div className={`glass-panel p-6 rounded-[24px] border ${safetyRisk.borderClass} ${
                safetyRisk.level === "safe" ? "bg-accent-green/5" : safetyRisk.level === "caution" ? "bg-yellow-500/5" : "bg-red-500/5"
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-full flex items-center justify-center border ${safetyRisk.badgeClass}`}>
                    {safetyRisk.level === "safe" ? (
                      <CheckCircle className={`w-8 h-8 ${safetyRisk.textClass}`} />
                    ) : (
                      <AlertTriangle className={`w-8 h-8 ${safetyRisk.textClass} ${safetyRisk.level === "contaminated" ? "animate-bounce" : ""}`} />
                    )}
                  </div>
                  <div className="space-y-2 text-left flex-1">
                    <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider">SPECTROSCOPY SAFETY READOUT</span>
                    <h2 className="font-display text-2xl font-bold text-white uppercase flex flex-wrap items-center gap-3">
                      {worstMetal.name} ({worstMetal.symbol}) Risk:
                      <LeadRiskBadgeFromInfo risk={safetyRisk} />
                    </h2>
                    <p className="font-mono text-xs text-on-surface-variant/90">
                      Measured: <span className={`font-bold ${safetyRisk.textClass}`}>{worstMetal.ppm.toFixed(4)} ppm</span>
                      {" "}• {worstMetal.description}
                    </p>
                    <p className="font-mono text-xs">
                      Safety Score:{" "}
                      <span className={`font-bold ${safetyScore >= 90 ? "text-accent-green" : safetyScore >= 65 ? "text-yellow-400" : "text-red-400"}`}>
                        {safetyScore.toFixed(1)} / 100
                      </span>
                      <span className="text-on-surface-variant/70"> (higher = safer)</span>
                    </p>
                    <p className="font-body text-xs text-on-surface-variant/90 leading-relaxed max-w-2xl">
                      {currentResult.toxicity_report}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-ppm heavy metal profiles */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {(
                  [
                    { symbol: "Pb" as MetalSymbol, ppm: currentResult.trace_pb ?? 0, decimals: 4 },
                    { symbol: "Cd" as MetalSymbol, ppm: currentResult.trace_cd ?? 0, decimals: 4 },
                    { symbol: "Hg" as MetalSymbol, ppm: currentResult.trace_hg ?? 0, decimals: 5 },
                    { symbol: "As" as MetalSymbol, ppm: currentResult.trace_as ?? 0, decimals: 4 },
                  ] as const
                ).map(({ symbol, ppm, decimals }) => {
                  const risk = getMetalRiskBySymbol(symbol, ppm);
                  const limits = METAL_LIMITS[symbol];
                  const isPrimary = worstMetal.symbol === symbol;
                  return (
                    <TiltCard
                      key={symbol}
                      className={`glass-panel p-5 rounded-2xl border h-auto ${
                        isPrimary ? `${risk.borderClass} ring-1 ring-white/10` : "border-white/5"
                      }`}
                    >
                      <div className="space-y-3 text-left w-full h-full">
                        <div className="flex justify-between items-start gap-2">
                          <div className="font-mono text-[9px] text-on-surface-variant uppercase font-bold">
                            {limits.label}
                            {isPrimary && (
                              <span className="ml-1 text-accent-orange">• PRIMARY</span>
                            )}
                          </div>
                          <LeadRiskBadgeFromInfo risk={risk} />
                        </div>
                        <div className={`font-mono text-xl font-bold ${risk.textClass}`}>
                          {ppm.toFixed(decimals)}{" "}
                          <span className="text-xs font-normal text-white/70">ppm</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${risk.barClass}`}
                            style={{ width: `${metalBarPercentBySymbol(symbol, ppm)}%` }}
                          ></div>
                        </div>
                        <div className="font-mono text-[8px] text-on-surface-variant">
                          Limit: {limits.cautionMax} ppm · {risk.emoji} {risk.label}
                        </div>
                      </div>
                    </TiltCard>
                  );
                })}
              </div>

              </motion.div>
            )}

            {/* TAB 4: ML MODEL ENGINE COMPARISONS */}
            {activeTab === "models" && (
              <motion.div 
                key="models"
                initial={{ opacity: 0, y: 20, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -20, rotateX: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
              {/* Interactive SVG Neural Network graph */}
              <div className="glass-panel p-6 rounded-[24px]">
                <div className="mb-6 text-left">
                  <h2 className="font-display text-xl font-bold text-white uppercase mb-1">Interactive Synapstic Network Diagram</h2>
                  <p className="font-body text-xs text-on-surface-variant/80">
                    Hover mouse over canvas to energize synaptic path structures. Represents MLP Classifier weights.
                  </p>
                </div>
                
                <div className="w-full h-[320px] rounded-xl bg-black/40 border border-white/5 overflow-hidden relative">
                  <div className="absolute top-4 right-4 font-mono text-[9px] text-accent-cyan tracking-wider">ACTIVE_CALIBRATION: ONLINE</div>
                  
                  <svg 
                    className="w-full h-full"
                    onMouseMove={handleSvgMouseMove}
                  >
                    {/* Background grid */}
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Interactive energy beam to cursor */}
                    {svgMouse.x > 0 && (
                      <line 
                        x1="220" y1="160" x2={svgMouse.x} y2={svgMouse.y}
                        stroke="rgba(0, 243, 255, 0.12)" strokeWidth="1.5" strokeDasharray="3 3"
                      />
                    )}

                    {/* Static model path lines */}
                    <g stroke="rgba(57,255,20,0.15)" strokeWidth="0.8">
                      {/* Inputs to Hidden */}
                      <line x1="80" y1="80" x2="220" y2="60" />
                      <line x1="80" y1="160" x2="220" y2="60" />
                      <line x1="80" y1="240" x2="220" y2="60" />
                      <line x1="80" y1="160" x2="220" y2="160" />
                      <line x1="80" y1="240" x2="220" y2="160" />
                      <line x1="80" y1="80" x2="220" y2="260" />
                      <line x1="80" y1="240" x2="220" y2="260" />

                      {/* Hidden to Output */}
                      <line x1="220" y1="60" x2="360" y2="110" />
                      <line x1="220" y1="160" x2="360" y2="110" />
                      <line x1="220" y1="160" x2="360" y2="210" />
                      <line x1="220" y1="260" x2="360" y2="210" />
                    </g>

                    {/* Nodes (Green/Cyan pulsing) */}
                    <g>
                      {/* Inputs */}
                      <circle cx="80" cy="80" r="5" fill="#00f3ff" className="pulse-node" />
                      <text x="40" y="83" fill="#baccb0" fontSize="8" fontFamily="JetBrains Mono">INPUT_C</text>
                      <circle cx="80" cy="160" r="5" fill="#00f3ff" className="pulse-node" />
                      <text x="40" y="163" fill="#baccb0" fontSize="8" fontFamily="JetBrains Mono">INPUT_N</text>
                      <circle cx="80" cy="240" r="5" fill="#00f3ff" className="pulse-node" />
                      <text x="40" y="243" fill="#baccb0" fontSize="8" fontFamily="JetBrains Mono">INPUT_Pb</text>

                      {/* Hidden */}
                      <circle cx="220" cy="60" r="6" fill="#39ff14" className="pulse-node" />
                      <circle cx="220" cy="160" r="6" fill="#39ff14" className="pulse-node" />
                      <circle cx="220" cy="260" r="6" fill="#39ff14" className="pulse-node" />

                      {/* Outputs */}
                      <circle cx="360" cy="110" r="7" fill="#fff" className="pulse-node" style={{ filter: "drop-shadow(0 0 8px #fff)" }} />
                      <text x="380" y="113" fill="#fff" fontSize="9" fontFamily="Space Grotesk" fontWeight="bold">NUTRITION_OUT</text>
                      <circle cx="360" cy="210" r="7" fill="#fff" className="pulse-node" style={{ filter: "drop-shadow(0 0 8px #fff)" }} />
                      <text x="380" y="213" fill="#fff" fontSize="9" fontFamily="Space Grotesk" fontWeight="bold">TOXICITY_OUT</text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Recharts Model comparisons */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Accuracy comparison chart */}
                <div className="lg:col-span-8 glass-panel p-6 rounded-[24px]">
                  <h3 className="font-display text-lg font-bold text-white uppercase mb-4">Live Models Benchmarks</h3>
                  <div className="w-full h-[280px]">
                    <ChartWrapper>
                      <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={modelAccuracyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" stroke="#baccb0" fontSize={9} fontFamily="JetBrains Mono" />
                        <YAxis yAxisId="left" stroke="#39ff14" fontSize={9} fontFamily="JetBrains Mono" label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: { fill: "#39ff14", fontSize: "9px" } }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#00f3ff" fontSize={9} fontFamily="JetBrains Mono" label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight', style: { fill: "#00f3ff", fontSize: "9px" } }} />
                        <Tooltip 
                          contentStyle={{ background: "rgba(13,13,13,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                          itemStyle={{ fontSize: "11px", color: "#fff" }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "10px", fontFamily: "JetBrains Mono" }} />
                        <Bar yAxisId="left" dataKey="Accuracy" fill="#39ff14" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="Latency" fill="#00f3ff" radius={[4, 4, 0, 0]} />
                      </BarChart>
                      </ResponsiveContainer>
                    </ChartWrapper>
                  </div>
                </div>

                {/* Model stats summary */}
                <div className="lg:col-span-4 glass-panel p-6 rounded-[24px] flex flex-col justify-between">
                  <h3 className="font-display text-lg font-bold text-white uppercase mb-4">Engine Metrics List</h3>
                  
                  <div className="space-y-4 font-mono text-[10px] text-on-surface-variant">
                    {modelMetrics.map((m) => (
                      <div key={m.model_name} className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-white font-bold">{m.model_name}</span>
                        <div className="text-right">
                          <div className="text-accent-green">Acc: {(m.accuracy * 100).toFixed(1)}%</div>
                          <div className="text-[8px]">Lat: {m.latency_ms.toFixed(2)}ms</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 text-[9px] font-mono text-on-surface-variant/80">
                    Accuracy represents average classification F1 score across 1,000 validation samples. Latencies measured on single threaded CPU scans.
                  </div>
                </div>

              </div>

              </motion.div>
            )}

            {/* TAB 5: SCAN ARCHIVES */}
            {activeTab === "archives" && (
              <motion.div 
                key="archives"
                initial={{ opacity: 0, y: 20, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -20, rotateX: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="glass-panel p-6 rounded-[24px] space-y-6"
              >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-white uppercase">Historical Food Analysis Archives</h2>
                  <p className="font-body text-xs text-on-surface-variant/80">Archives of spectrometry calibrations completed inside this lab node.</p>
                </div>
              </div>

              {/* Archives table grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-on-surface-variant">
                      <th className="pb-3 pt-1">TIMESTAMP</th>
                      <th className="pb-3 pt-1">SAMPLE</th>
                      <th className="pb-3 pt-1">CATEGORY</th>
                      <th className="pb-3 pt-1">PROTEIN</th>
                      <th className="pb-3 pt-1">FAT</th>
                      <th className="pb-3 pt-1">CARBS</th>
                      <th className="pb-3 pt-1 text-center">SAFETY</th>
                      <th className="pb-3 pt-1 text-center">QUALITY INDEX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalScans.map((scan) => (
                      <tr 
                        key={scan.id} 
                        onClick={() => {
                          setCurrentResult(scan);
                          setActiveTab("report"); // Switch to report tab to inspect this historical item!
                        }}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-all duration-150"
                      >
                        <td className="py-4 text-[10px] text-on-surface-variant whitespace-nowrap">
                          {formatScanTime(scan.created_at)}<br/>
                          {formatScanDate(scan.created_at)}
                        </td>
                        <td className="py-4 font-bold text-white">{scan.name}</td>
                        <td className="py-4 text-[10px] text-accent-cyan">{scan.category.toUpperCase()}</td>
                        <td className="py-4 text-accent-green">{scan.protein_pred.toFixed(1)}%</td>
                        <td className="py-4 text-accent-cyan">{scan.fat_pred.toFixed(1)}%</td>
                        <td className="py-4 text-accent-orange">{scan.carbs_pred.toFixed(1)}%</td>
                        <td className="py-4 text-center whitespace-nowrap">
                          <LeadRiskBadgeFromInfo risk={resolveSafetyGrade(scan)} />
                        </td>
                        <td className="py-4 text-center font-bold text-accent-green">{scan.quality_score.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              </motion.div>
            )}

          </AnimatePresence>

        </section>
      </div>

      {/* 3. Global Atmospheric Background bokeh layers */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-green/3 filter blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent-cyan/3 filter blur-[120px] pointer-events-none z-0"></div>
    </div>
  );
}
