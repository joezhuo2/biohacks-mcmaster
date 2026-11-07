"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useState } from "react";
import { LiveContext, useLiveConnection } from "@/hooks/useLive";
import { useMode } from "@/hooks/useMode";
import { FamilyView } from "./family/FamilyView";
import { Header } from "./Header";
import { spring } from "./motion";
import { PhysicianView } from "./physician/PhysicianView";

export function Dashboard() {
  const live = useLiveConnection();
  const [mode, setMode] = useMode();
  const [dismissed, setDismissed] = useState<string | null>(null);

  return (
    <LiveContext value={live}>
      <MotionConfig reducedMotion="user" transition={spring}>
        <Header mode={mode} onMode={setMode} />
        <AnimatePresence mode="wait" initial={false}>
          {mode && (
            <motion.main
              key={mode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {mode === "family" ? <FamilyView dismissed={dismissed} onDismiss={setDismissed} /> : <PhysicianView />}
            </motion.main>
          )}
        </AnimatePresence>
      </MotionConfig>
    </LiveContext>
  );
}
