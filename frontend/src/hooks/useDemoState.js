import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  INITIAL_SKILLS,
  rankAllOpportunities,
  generatePlanForOpportunity,
  parseChatMessage,
  OPPORTUNITIES,
  extractSkillsFromCv
} from '../data/mock.js';
import {
  extractCv,
  correctProfile,
  setProfileSkills,
  confirmProfile,
  savePlan,
  updateActivityStatus,
  getDemoCv
} from '../api/client.js';

const STORAGE_KEY_PLANS = 'careerpath_saved_plans_v2';
const STORAGE_KEY_SKILLS = 'careerpath_user_skills_v2';

export function useDemoState() {
  const [step, setStep] = useState(1);
  const [unlockedStep, setUnlockedStep] = useState(1);

  // Reset the workflow to Step 1 for analyzing a new CV
  const resetWorkflow = () => {
    setStep(1);
    setUnlockedStep(1);
    setCvText("");
    setUploadedFile(null);
  };

  // Unlocks future steps only when the user finishes the current step's action
  const advanceToStep = (nextStep) => {
    setUnlockedStep((prev) => Math.max(prev, nextStep));
    setStep(nextStep);
  };

  // Guarded navigation for header tabs (only allows visited/unlocked steps)
  const goToStep = (targetStep) => {
    if (targetStep <= unlockedStep) {
      setStep(targetStep);
    }
  };

  const [cvText, setCvText] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // User Skills
  const [skills, setSkills] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SKILLS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SKILLS;
  });

  // Selected Opportunity
  const [selectedOppId, setSelectedOppId] = useState("OPP-01");

  // Plan State
  const [planIntensity, setPlanIntensity] = useState("standard");
  const [activePlan, setActivePlan] = useState(() => {
    const opp =
      OPPORTUNITIES.find((o) => o.id === "OPP-01") || OPPORTUNITIES[0];
    return generatePlanForOpportunity(opp, INITIAL_SKILLS, "standard");
  });

  // Saved Plans
  // Change lines 49-74 to:
  const [savedPlans, setSavedPlans] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLANS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {}; // <-- Returns empty object instead of dummy plan
  });

  // UI Micro-States
  const [scoreDeltas, setScoreDeltas] = useState({});
  const [isReranking, setIsReranking] = useState(false);
  const [highlightedSkillId, setHighlightedSkillId] = useState(null);
  const [lastSavedPlanId, setLastSavedPlanId] = useState("");

  // Filters for Step 2
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMin60, setFilterMin60] = useState(false);
  const [filterHideMissingReq, setFilterHideMissingReq] = useState(false);

  // Chat Panel
  const [chatOpen, setChatOpen] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Hi! I'm your CareerPath AI adviser. Once you upload or paste your CV, I can explain match criteria, adjust your skills, or tune your 7-day study plan. Try typing 'remove SQL', 'add Figma, working', or 'Why is #1 my best match?'.",
      timestamp: "Just now",
    },
  ]);

  // Persist skills & saved plans to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SKILLS, JSON.stringify(skills));
    } catch {}
  }, [skills]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(savedPlans));
    } catch {}
  }, [savedPlans]);

  // Ranked Opportunities (computed via mock scoring formula)
  const previousScores = useRef({});
  const rankedOpportunities = useMemo(() => {
    return rankAllOpportunities(skills);
  }, [skills]);

  // Seed baseline scores on first render so first skill change shows delta badges
  useEffect(() => {
    if (
      Object.keys(previousScores.current).length === 0 &&
      rankedOpportunities.length > 0
    ) {
      rankedOpportunities.forEach((opp) => {
        previousScores.current[opp.id] = opp.score;
      });
    }
  }, [rankedOpportunities]);

  // Current selected opportunity with computed fit
  const selectedOpportunity = useMemo(() => {
    return (
      rankedOpportunities.find((o) => o.id === selectedOppId) ||
      rankedOpportunities[0]
    );
  }, [rankedOpportunities, selectedOppId]);

  // Re-generate plan whenever chosen opportunity or intensity changes
  useEffect(() => {
    if (selectedOpportunity) {
      const newPlan = generatePlanForOpportunity(
        selectedOpportunity,
        skills,
        planIntensity,
      );
      setActivePlan(newPlan);
    }
  }, [selectedOpportunity, planIntensity, skills]);

  // Core skill mutation with animation and delta badges
  const triggerSkillUpdate = useCallback(
    (nextSkills, changedSkillId = null) => {
      setIsReranking(true);
      if (changedSkillId) {
        setHighlightedSkillId(changedSkillId);
        setTimeout(() => setHighlightedSkillId(null), 2000);
      }

      const oldTopId = rankedOpportunities[0]?.id;

      setTimeout(() => {
        const nextRanked = rankAllOpportunities(nextSkills);
        const deltas = {};

        nextRanked.forEach((item, index) => {
          const oldScore = previousScores.current[item.id];
          if (oldScore !== undefined) {
            const diff = item.score - oldScore;
            if (diff !== 0) {
              deltas[item.id] = {
                delta: diff > 0 ? `+${diff}` : `${diff}`,
                isNewTop: index === 0 && oldTopId !== item.id,
              };
            }
          }
          previousScores.current[item.id] = item.score;
        });

        setScoreDeltas(deltas);
        setSkills(nextSkills);
        setIsReranking(false);

        // Deltas fade after ~4 seconds
        setTimeout(() => setScoreDeltas({}), 4000);
      }, 300);
    },
    [rankedOpportunities],
  );

  // Helper actions
  const updateSkillLevel = (id, newLevel) => {
    const next = skills.map((s) =>
      s.id === id ? { ...s, level: newLevel, removed: false } : s,
    );
    triggerSkillUpdate(next, id);
  };

  const removeSkill = (id) => {
    const next = skills.map((s) => (s.id === id ? { ...s, removed: true } : s));
    triggerSkillUpdate(next, id);
  };

  const restoreSkill = (id) => {
    const next = skills.map((s) =>
      s.id === id ? { ...s, removed: false } : s,
    );
    triggerSkillUpdate(next, id);
  };

  const addSkill = (name, level = "working", evidence = "") => {
    const existingIndex = skills.findIndex(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    );
    let next = [];
    let targetId = "";

    if (existingIndex >= 0) {
      targetId = skills[existingIndex].id;
      next = skills.map((s, idx) =>
        idx === existingIndex
          ? { ...s, level, evidence: evidence || s.evidence, removed: false }
          : s,
      );
    } else {
      targetId = `sk-${Date.now()}`;
      next = [
        ...skills,
        {
          id: targetId,
          name,
          level,
          evidence: evidence || "Added from student profile update.",
          weakEvidence: false,
          removed: false,
        },
      ];
    }

    triggerSkillUpdate(next, targetId);
  };

  const extractSkillsFromCurrentCv = async (textToUse, pdfBase64 = null) => {
    const content = textToUse !== undefined ? textToUse : cvText;
    setIsExtracting(true);
    try {
      const extracted = await extractCv(content, pdfBase64);
      triggerSkillUpdate(extracted);
    } catch {
      const localExtracted = extractSkillsFromCv(content);
      triggerSkillUpdate(localExtracted);
    } finally {
      setIsExtracting(false);
    }
  };

  const clearCv = () => {
    setCvText("");
    setUploadedFile(null);
  };

  const resetToDemo = async () => {
    try {
      const demo = await getDemoCv();
      setCvText(demo);
    } catch {
      clearCv();
    }
  };

  // Chat sender with real/fallback API correction
  // Chat sender with real/fallback API correction
  const sendChatMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setAiTyping(true);

    try {
      const isMockMode = import.meta.env.VITE_USE_MOCK === "true";
      let backendSuccess = false;

      if (!isMockMode) {
        try {
          const result = await correctProfile(text, skills);
          if (result && result.skills && result.skills.length > 0) {
            triggerSkillUpdate(result.skills);
            setChatMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 1,
                sender: "ai",
                text:
                  result.reply ||
                  "I've updated your skills profile according to your notes.",
                timestamp: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ]);
            backendSuccess = true;
          }
        } catch {
          backendSuccess = false;
        }
      }

      // Local / Mock fallback handler
      if (!backendSuccess) {
        const parsed = parseChatMessage(text, skills, activePlan);
        if (parsed.action === "lighten_plan") {
          setPlanIntensity("light");
        } else if (parsed.updatedSkills && parsed.updatedSkills !== skills) {
          triggerSkillUpdate(parsed.updatedSkills);
        }

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "ai",
            text: parsed.reply,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    } finally {
      setAiTyping(false);
    }
  };

  // Edit specific task in active plan
  const updateActivePlanTask = (day, updates) => {
    setActivePlan((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.day === day ? { ...t, ...updates } : t)),
    }));
  };

  // Save current active plan (Endpoint 13: Tool 3)
  const saveCurrentPlan = async () => {
    const fallbackId = `PLAN-${Math.floor(1000 + Math.random() * 9000)}`;
    // Set ID immediately so Step 5 is never blank while network resolves
    setLastSavedPlanId(fallbackId);

    const newSaved = {
      id: fallbackId,
      opportunityId: selectedOpportunity.id,
      title: selectedOpportunity.title,
      org: selectedOpportunity.organization,
      savedAt:
        "Today, " +
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      intensity: planIntensity,
      uncovered: activePlan.uncovered,
      tasks: activePlan.tasks,
    };

    try {
      const res = await savePlan({
        opportunity: selectedOpportunity,
        plan: activePlan,
        intensity: planIntensity,
      });
      const generatedId = res.planId || fallbackId;
      newSaved.id = generatedId;
      setSavedPlans((prev) => ({ ...prev, [generatedId]: newSaved }));
      setLastSavedPlanId(generatedId);
      return generatedId;
    } catch {
      setSavedPlans((prev) => ({ ...prev, [fallbackId]: newSaved }));
      setLastSavedPlanId(fallbackId);
      return fallbackId;
    }
  };

  // Toggle a task's done state in a saved plan
  const toggleSavedPlanTaskDone = (planId, day) => {
    const plan = savedPlans[planId];
    if (!plan) return;
    const task = plan.tasks.find((t) => t.day === day);
    if (!task) return;
    const nextDone = !task.done;

    setSavedPlans((prev) => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        tasks: prev[planId].tasks.map((t) =>
          t.day === day ? { ...t, done: nextDone } : t,
        ),
      },
    }));

    updateActivityStatus(planId, day, nextDone).catch(() => {});
  };

  return {
    step,
    setStep,
    unlockedStep,
    advanceToStep,
    goToStep,
    resetWorkflow,
    cvText,
    setCvText,
    uploadedFile,
    setUploadedFile,
    extractSkillsFromCurrentCv,
    clearCv,
    isExtracting,
    setIsExtracting,
    skills,
    highlightedSkillId,
    updateSkillLevel,
    removeSkill,
    restoreSkill,
    addSkill,
    resetToDemo,
    selectedOppId,
    setSelectedOppId,
    selectedOpportunity,
    rankedOpportunities,
    scoreDeltas,
    isReranking,
    searchTerm,
    setSearchTerm,
    filterMin60,
    setFilterMin60,
    filterHideMissingReq,
    setFilterHideMissingReq,
    planIntensity,
    setPlanIntensity,
    activePlan,
    updateActivePlanTask,
    savedPlans,
    lastSavedPlanId,
    saveCurrentPlan,
    toggleSavedPlanTaskDone,
    chatOpen,
    setChatOpen,
    aiTyping,
    chatMessages,
    sendChatMessage,
  };
}
