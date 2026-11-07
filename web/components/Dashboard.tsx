"use client";

import { MotionConfig, motion } from "motion/react";
import { memo, useState } from "react";
import { LiveContext, useLiveConnection } from "@/hooks/useLive";
import { useMode } from "@/hooks/useMode";
import { FamilyView as FamilyViewBase } from "./family/FamilyView";
import { Header } from "./Header";
import { spring } from "./motion";
import { PhysicianView as PhysicianViewBase } from "./physician/PhysicianView";

const FamilyView = memo(FamilyViewBase);
const PhysicianView = memo(PhysicianViewBase);
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
                inert={mode !== m}
                aria-hidden={mode !== m}
                // invisible instead of display:none keeps chart sizes so returning to a view does not re-measure every chart
                className={mode === m ? "" : "pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden"}
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
