import React, { useState } from 'react';
import { Edit2, Check, X, Clock } from 'lucide-react';

export default function PlanDayRow({ task, onUpdateTask }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.title);
  const [editMinutes, setEditMinutes] = useState(task.minutes);

  // Sync edit inputs when intensity changes update task.minutes from parent
  React.useEffect(() => {
    if (!isEditing) {
      setEditText(task.title);
      setEditMinutes(task.minutes);
    }
  }, [task.title, task.minutes, isEditing]);

  const handleSave = (e) => {
    e.preventDefault();
    if (onUpdateTask) {
      onUpdateTask(task.day, {
        title: editText.trim() || task.title,
        minutes: Number(editMinutes) >= 0 ? Number(editMinutes) : task.minutes,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(task.title);
    setEditMinutes(task.minutes);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form
        onSubmit={handleSave}
        className="py-3 px-3 bg-indigo-50/50 border border-indigo-200 rounded-lg space-y-2 text-xs"
      >
        <div className="flex items-center justify-between text-indigo-900 font-bold">
          <span>Edit Day {task.day}</span>
          <div className="flex items-center gap-1">
            <button
              type="submit"
              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
              title="Save changes"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 text-slate-500 hover:bg-slate-200 rounded"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full text-xs p-2 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Activity description..."
          required
        />

        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-600 font-medium">
            Minutes:
          </label>
          <input
            type="number"
            min="0"
            max="180"
            value={editMinutes}
            onChange={(e) => setEditMinutes(e.target.value)}
            className="w-20 text-xs p-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          />
        </div>
      </form>
    );
  }

  return (
    <div className="py-3.5 flex items-start justify-between gap-3 text-xs group hover:bg-slate-50/60 px-2 rounded-lg transition-colors">
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-900">
            Day {task.day}:
          </span>
          <span
            className={
              task.isRest
                ? "text-slate-400 font-semibold italic"
                : "text-slate-800 font-medium"
            }
          >
            {task.title}
          </span>
        </div>

        {task.resId && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-1.5 py-0.2 rounded font-semibold">
              Asset: {task.resId}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-slate-500 tabular-nums text-xs">
          {task.isRest ? (
            <span className="text-slate-400 italic">Rest Day</span>
          ) : (
            `${task.minutes} min`
          )}
        </span>

        {onUpdateTask && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-slate-300 hover:text-indigo-600 p-1 transition-colors opacity-70 group-hover:opacity-100"
            title="Edit day task"
            aria-label={`Edit Day ${task.day}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
