"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, FlaskConical, ShieldAlert, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import TiltCard from "../components/TiltCard";

const ThreeDScanner = dynamic(() => import("../components/ThreeDScanner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center font-mono text-xs text-on-surface-variant">
      Initializing 3D scanner…
    </div>
  ),
});

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("Grain");
  const categories = ["Grain", "Fruit", "Vegetable", "Meat", "Dairy"];

  // 3D Staggered animation configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 30, rotateX: 8, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 80,
        damping: 18,
      },
    },
  } as const;

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col font-sans">
      {/* 1. Header Navigation Bar */}
      <header className="fixed top-0 left-0 w-full z-50 grid grid-cols-[1fr_auto_1fr] items-center px-6 md:px-16 py-4 bg-surface-charcoal/40 backdrop-blur-xl border-b border-white/8 shadow-2xl">
        <div aria-hidden="true" />
        <h1 className="font-mono text-xs md:text-sm tracking-[0.25em] text-accent-green font-bold uppercase text-center">
          Food Intelligence Lab
        </h1>
        <div className="flex items-center justify-end">
          <Link 
            href="/dashboard" 
            className="px-5 py-2 glass-panel border-accent-cyan/30 text-accent-cyan font-mono text-xs rounded-lg hover:bg-accent-cyan/10 transition-all flex items-center gap-2 group active:scale-95 duration-100"
          >
            ENTER LAB TERMINAL
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1 flex flex-col pt-20">
        <section className="relative min-h-[90vh] flex items-center px-6 md:px-16 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-center z-10">
            
            {/* Left Hero Details - Animated */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-5 space-y-8 text-left mt-8 lg:mt-0"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 glass-panel rounded-full border-white/10">
                <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse glow-green"></span>
                <span className="font-mono text-[10px] tracking-widest text-accent-green uppercase">
                  Quantum Node Active: SECURE_STREAM
                </span>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-4">
                <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-tight text-white">
                  AI Food Analysis & <br />
                  <span className="text-accent-green drop-shadow-[0_0_20px_rgba(57,255,20,0.15)]">
                    Spectrometry Profiling
                  </span>
                </h1>
                <p className="font-body text-base md:text-lg text-on-surface-variant/80 max-w-lg leading-relaxed">
                  Analyze molecular composition signatures, predict macronutrient parameters, detect sub-ppm toxic elements, and classify food safety grades with pre-trained decision forests.
                </p>
              </motion.div>

              {/* Action Button */}
              <motion.div variants={itemVariants}>
                <Link
                  href="/dashboard"
                  className="inline-flex px-8 py-4 bg-accent-green text-black font-mono text-xs font-bold rounded-lg items-center justify-center gap-3 glow-green hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  LAUNCH SCANNER
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>

              {/* Stats Ticker */}
              <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 pt-6">
                <div className="glass-panel p-4 rounded-xl border-white/6 text-left">
                  <div className="font-mono text-accent-green text-lg md:text-xl font-bold">99.7%</div>
                  <div className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider">ML Accuracy</div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-white/6 text-left">
                  <div className="font-mono text-accent-cyan text-lg md:text-xl font-bold">&lt; 15ms</div>
                  <div className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider">Inference Latency</div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-white/6 text-left">
                  <div className="font-mono text-white text-lg md:text-xl font-bold">12 Features</div>
                  <div className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider">Spectrometry Input</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Hero ThreeDScanner Visualizer */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, z: -100 }}
              animate={{ opacity: 1, scale: 1, z: 0 }}
              transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.2 }}
              className="lg:col-span-7 relative h-[450px] lg:h-[650px] flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-20 pointer-events-none"></div>
              
              {/* Category select tab overlays */}
              <div className="absolute top-2 z-30 flex gap-2 p-1 glass-panel rounded-full border-white/5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full font-mono text-[10px] uppercase transition-all cursor-pointer ${
                      activeCategory === cat
                        ? "bg-accent-green text-black font-bold"
                        : "text-on-surface-variant hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full h-full max-w-2xl glass-panel rounded-[32px] overflow-hidden border-white/8 shadow-2xl">
                <div className="scan-line z-20"></div>
                <ThreeDScanner category={activeCategory} isScanning={true} />

                {/* HUD Screen overlays */}
                <div className="absolute top-16 left-8 z-20 space-y-2 pointer-events-none text-left">
                  <div className="font-mono text-[10px] text-accent-green/80 tracking-widest font-bold">SPECTRO_SCAN_READY</div>
                  <div className="w-24 h-[1px] bg-accent-green/20"></div>
                  <div className="font-mono text-[9px] text-on-surface-variant">ACTIVE_TARGET: {activeCategory.toUpperCase()}_SIGNATURE</div>
                </div>
                <div className="absolute bottom-8 right-8 z-20 flex flex-col items-end pointer-events-none">
                  <div className="w-12 h-12 border-r border-b border-accent-cyan/40"></div>
                  <div className="font-mono text-[9px] text-accent-cyan/80 tracking-wider mt-2 font-bold uppercase">LOCK_ACQUIRED</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 3. Bento Grid Capabilities Section */}
        <section id="capabilities" className="py-24 px-6 md:px-16 space-y-12">
          <div className="text-left space-y-2 max-w-xl">
            <h2 className="font-display text-2xl md:text-4xl font-bold tracking-tight text-white uppercase">
              Analytical Modules
            </h2>
            <p className="font-body text-on-surface-variant/80">
              Multi-spectral spectrometry parsing using calibrated decision engines.
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-12 gap-6"
          >
            {/* Box 1: Spectrometer scanner */}
            <motion.div variants={itemVariants} className="md:col-span-6 h-[300px]">
              <TiltCard className="glass-panel p-8 rounded-[24px] overflow-hidden group hover:border-accent-green/30 transition-all duration-300 h-full">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/30 flex items-center justify-center text-accent-green">
                      <FlaskConical className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] tracking-widest text-accent-green font-bold">01_SPECTRO_PARSING</span>
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-white">AI Food Spectrography</h3>
                  <p className="font-body text-sm text-on-surface-variant/80 max-w-sm">
                    Leverages multi-variable elemental signatures (C, H, O, N) to parse protein Kjeldahl ratios and lipid bonds in real-time.
                  </p>
                </div>
                <Link href="/dashboard" className="font-mono text-xs text-accent-green hover:underline flex items-center gap-1">
                  ACCESS SYSTEM TERMINAL <ArrowRight className="w-3 h-3" />
                </Link>
              </TiltCard>
            </motion.div>

            {/* Box 2: Quality grading */}
            <motion.div variants={itemVariants} className="md:col-span-3 h-[300px]">
              <TiltCard className="glass-panel p-8 rounded-[24px] group hover:border-accent-cyan/30 transition-all duration-300 h-full">
                <div className="space-y-4">
                  <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white">Quality Calibration</h3>
                  <p className="font-body text-xs text-on-surface-variant/80">
                    Instantly outputs premium (A+), standard (B), or poor (C) quality evaluations using nutrient density calculations.
                  </p>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5 mt-auto">
                  <span className="font-mono text-[10px] text-accent-cyan font-bold uppercase">GRADE_ESTIMATE: Premium</span>
                </div>
              </TiltCard>
            </motion.div>

            {/* Box 3: Heavy Metal Toxicity */}
            <motion.div variants={itemVariants} className="md:col-span-3 h-[300px]">
              <TiltCard className="glass-panel p-8 rounded-[24px] border-accent-orange/15 group hover:border-accent-orange/30 transition-all duration-300 h-full">
                <div className="space-y-4">
                  <div className="w-8 h-8 rounded-lg bg-accent-orange/10 border border-accent-orange/30 flex items-center justify-center text-accent-orange">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white">Heavy Metal Toxicity</h3>
                  <p className="font-body text-xs text-on-surface-variant/80">
                    Detects sub-ppm levels of Lead (Pb), Cadmium (Cd), Mercury (Hg), and Arsenic (As) using non-linear SVM boundaries.
                  </p>
                </div>
                <div className="flex items-center gap-2 p-2 bg-accent-orange/5 rounded-lg border border-accent-orange/20 animate-pulse mt-auto">
                  <span className="font-mono text-[10px] text-accent-orange font-bold uppercase">TOXICITY_MONITORING: ACTIVE</span>
                </div>
              </TiltCard>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* 4. Footer */}
      <footer className="py-12 px-6 md:px-16 border-t border-white/5 bg-black/40">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 opacity-60">
          <div>
            <div className="font-mono text-[10px] text-accent-green tracking-widest uppercase font-bold mb-1">
              Food Intelligence Lab
            </div>
            <p className="font-mono text-[9px] text-on-surface-variant">
              SECURED BY QUANTUM_X_PROTOCOL. ALL DATA LICENSED UNDER LAB PRIVACY CLEARANCE.
            </p>
          </div>
          <div className="font-mono text-[9px] text-on-surface-variant">
            © 2026 Food Intelligence Lab.
          </div>
        </div>
      </footer>
    </div>
  );
}
