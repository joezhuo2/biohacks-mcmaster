"use client";

import { MotionConfig, motion } from "motion/react";
import { useState } from "react";
import { LiveContext, useLiveConnection } from "@/hooks/useLive";
import { useMode } from "@/hooks/useMode";
import { FamilyView } from "./family/FamilyView";
import { Header } from "./Header";
import { spring } from "./motion";
import { PhysicianView } from "./physician/PhysicianView";

const modes = ["family", "physician"] as const;

export function Dashboard() {
  const live = useLiveConnection();
  const [mode, setMode] = useMode();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [visited, setVisited] = useState(() => new Set<string>());
  if (mode && !visited.has(mode)) setVisited(new Set(visited).add(mode));

  return (
    <LiveContext value={live}>
      <MotionConfig reducedMotion="user" transition={spring}>
        <Header mode={mode} onMode={setMode} />
        {modes.map(
          (m) =>
            visited.has(m) && (
              <motion.main
                key={m}
                hidden={mode !== m}
                initial={{ opacity: 0 }}
                animate={{ opacity: mode === m ? 1 : 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {m === "family" ? <FamilyView dismissed={dismissed} onDismiss={setDismissed} /> : <PhysicianView />}
              </motion.main>
            ),
        )}
      </MotionConfig>
    </LiveContext>
  );
}
