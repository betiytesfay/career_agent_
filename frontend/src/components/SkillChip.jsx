import React from 'react';

export default function SkillChip({ name, level, variant = 'default', isRequired = false, onRemove }) {
  if (variant === 'matched') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">✓</span>
        <span>{name}</span>
        {level && <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 capitalize font-normal">({level})</span>}
      </span>
    );
  }

    if (variant === "missing") {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
            isRequired
              ? "bg-amber-200 text-amber-950 border-amber-500 dark:bg-amber-400 dark:text-amber-950 dark:border-amber-300"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600"
          }`}
        >
          <span className="text-[10px] font-bold">!</span>
          <span>Missing {name}</span>
          {isRequired && <span className="text-[10px] font-bold">(Req)</span>}
        </span>
      );
    }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs">
      <span>{name}</span>
      {level && <span className="text-slate-400 dark:text-slate-500 capitalize text-[11px] font-normal">· {level}</span>}
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
          title="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}
