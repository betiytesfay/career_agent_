import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/ProgressBar.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { getPlan } from "../api/client.js";
import {
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Printer,
  Copy,
  Check,
} from "lucide-react";

export default function ReopenPlan({ savedPlans, toggleTaskDone }) {
  const [inputPlanId, setInputPlanId] = useState("");
  const [activePlanId, setActivePlanId] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fetchedRemotePlan, setFetchedRemotePlan] = useState(null);

  // Auto-select most recently saved plan on first load
  useEffect(() => {
    if (!activePlanId && savedPlans && Object.keys(savedPlans).length > 0) {
      const keys = Object.keys(savedPlans);
      const latestId = keys[keys.length - 1];
      setInputPlanId(latestId);
      setActivePlanId(latestId);
      setHasSearched(true);
    }
  }, [savedPlans]);

  // Normalize plan properties — supports both local (id/title/org) and backend (planId/opportunityTitle/organization) shapes
  const rawPlan =
    (savedPlans && savedPlans[activePlanId.trim().toUpperCase()]) ||
    fetchedRemotePlan;

  const currentPlan = rawPlan
    ? {
        ...rawPlan,
        id: rawPlan.id || rawPlan.planId,
        title: rawPlan.title || rawPlan.opportunityTitle,
        org: rawPlan.org || rawPlan.organization,
      }
    : null;

  const handleOpen = async (e) => {
    if (e) e.preventDefault();
    const clean = inputPlanId.trim().toUpperCase();
    setActivePlanId(clean);
    setHasSearched(true);

    if (!savedPlans || !savedPlans[clean]) {
      try {
        const remote = await getPlan(clean);
        if (remote) setFetchedRemotePlan(remote);
      } catch {}
    }
  };

  const handleSelectQuick = (id) => {
    setInputPlanId(id);
    setActivePlanId(id);
    setHasSearched(true);
  };

  // Compute tasks done
  const activeTasks = currentPlan
    ? currentPlan.tasks.filter((t) => !t.isRest)
    : [];
  const completedTasks = currentPlan
    ? currentPlan.tasks.filter((t) => t.done && !t.isRest)
    : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              CareerPath
            </span>
          </Link>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
            <Link to="/app" className="hover:text-indigo-600 transition-colors">
              Fit Engine
            </Link>
            <span className="text-indigo-600 font-bold flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>My Plans</span>
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Open Your Saved Plan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Enter your plan reference ID (e.g. PLAN-1001) to view or resume your
            7-day checklist.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <form onSubmit={handleOpen} className="flex gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={inputPlanId}
                onChange={(e) => setInputPlanId(e.target.value)}
                placeholder="Enter your plan ID (e.g. PLAN-1001)..."
                className="w-full text-xs font-mono uppercase pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-2.5 rounded-lg shadow-xs transition-colors shrink-0"
            >
              Open
            </button>
          </form>

          {/* Quick Select Saved Plans in Memory */}
          {savedPlans && Object.keys(savedPlans).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">
                Saved plans:
              </span>
              {Object.keys(savedPlans).map((pid) => (
                <button
                  key={pid}
                  type="button"
                  onClick={() => handleSelectQuick(pid)}
                  className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
                    activePlanId.toUpperCase() === pid
                      ? "bg-indigo-100 text-indigo-800 font-bold"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {pid}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Plan Display OR Error State */}
        {currentPlan ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded">
                    {currentPlan.id}
                  </span>
                  <span className="text-xs text-slate-500">
                    Saved {currentPlan.savedAt}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {currentPlan.title}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {currentPlan.org}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text =
                      `Plan ${currentPlan.id} for ${currentPlan.title} at ${currentPlan.org}:\n` +
                      currentPlan.tasks
                        .map(
                          (t) =>
                            `Day ${t.day}: ${t.title} [${t.done ? "Done" : "Not started"}]`,
                        )
                        .join("\n");
                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Bar ("2 of 5 done") */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <ProgressBar
                completed={completedTasks.length}
                total={activeTasks.length}
                label="done"
              />
            </div>

            {/* 7-Day Timeline with Checkboxes & Status Chips */}
            <div className="divide-y divide-slate-100">
              {currentPlan.tasks.map((task) => (
                <div
                  key={task.day}
                  className="py-3.5 flex items-start justify-between gap-4 text-xs group hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                >
                  <label className="flex items-start gap-3 cursor-pointer flex-1">
                    {!task.isRest ? (
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => {
                          if (toggleTaskDone) {
                            toggleTaskDone(currentPlan.id, task.day);
                          }
                          // Also update local state for remotely fetched plans
                          if (fetchedRemotePlan) {
                            setFetchedRemotePlan((prev) => ({
                              ...prev,
                              tasks: prev.tasks.map((t) =>
                                t.day === task.day
                                  ? { ...t, done: !t.done }
                                  : t,
                              ),
                            }));
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    ) : (
                      <span className="mt-1 w-2.5 h-2.5 bg-slate-300 rounded-full inline-block shrink-0" />
                    )}

                    <div className="space-y-0.5">
                      <span
                        className={`leading-relaxed ${
                          task.done
                            ? "line-through text-slate-400 font-medium"
                            : task.isRest
                              ? "text-slate-400 font-semibold italic"
                              : "text-slate-800 font-medium"
                        }`}
                      >
                        Day {task.day}: {task.title}
                      </span>

                      {task.resId && (
                        <div className="font-mono text-[10px] text-indigo-600">
                          Resource asset: {task.resId}
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Right side: Minutes & Status Chip (Done / Not started) */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-slate-400 tabular-nums">
                      {task.isRest ? "Rest" : `${task.minutes}m`}
                    </span>

                    {!task.isRest && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          task.done
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {task.done ? "Done" : "Not started"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Error State: "No plan found with that ID" */
          hasSearched && (
            <div className="p-8 text-center bg-white border border-dashed border-rose-200 rounded-2xl text-xs space-y-3 animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900">
                  No plan found with that ID
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  We couldn't locate a saved plan matching "{activePlanId}".
                  Check your plan reference ID or generate a new plan from the
                  fit engine.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <Link
                  to="/app"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  Create a new plan
                </Link>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}