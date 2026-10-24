import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  { num: 1, label: 'CV Upload', short: 'CV' },
  { num: 2, label: 'Skills & Fit', short: 'Skills' },
  { num: 3, label: 'Matches', short: 'Matches' },
  { num: 4, label: '7-Day Plan', short: 'Plan' },
  { num: 5, label: 'Saved Plan', short: 'Saved' }
];

export default function StepProgress({
  currentStep,
  unlockedStep = 1,
  onSelectStep,
}) {
  return (
    <div className="max-w-3xl mx-auto bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-1 sm:p-1.5 shadow-2xs">
      <div className="flex items-center justify-between text-xs font-semibold overflow-x-auto gap-1.5 sm:gap-2">
        {STEPS.map((s, idx) => {
          const isActive = currentStep === s.num;
          const isCompleted = currentStep > s.num;
          const isUnlocked = s.num <= unlockedStep;

          return (
            <React.Fragment key={s.num}>
              <button
                type="button"
                disabled={!isUnlocked}
                onClick={() =>
                  isUnlocked && onSelectStep && onSelectStep(s.num)
                }
                className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white font-bold shadow-xs"
                    : isCompleted
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                      : isUnlocked
                        ? "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                        : "text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed pointer-events-none"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {s.num}
                  </span>
                )}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.short}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className={`hidden md:block w-3 h-0.5 rounded-full shrink-0 ${
                    currentStep > s.num
                      ? "bg-emerald-400 dark:bg-emerald-600"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
