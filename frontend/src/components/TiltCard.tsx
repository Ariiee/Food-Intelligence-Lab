"use client";

import React from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function TiltCard({ children, className = "" }: TiltCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Map mouse coordinate ratios to 3D rotation degrees
  const rotateX = useTransform(y, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-12, 12]);

  // Subtle gloss reflection position
  const glossX = useTransform(x, [-0.5, 0.5], ["0%", "100%"]);
  const glossY = useTransform(y, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left - width / 2;
    const mouseY = event.clientY - rect.top - height / 2;
    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="perspective-1000">
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`relative ${className} cursor-pointer transition-shadow duration-300 hover:shadow-[0_20px_50px_rgba(0,243,255,0.15)]`}
      >
        {/* Glow-reflection overlay */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-[24px] z-10"
          style={{
            backgroundPosition: `${glossX} ${glossY}`,
          }}
        />
        {/* Inner container to apply transform-translateZ on child elements if needed */}
        <div style={{ transform: "translateZ(30px)" }} className="h-full flex flex-col justify-between">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
