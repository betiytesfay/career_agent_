import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StepProgress from '../components/StepProgress.jsx';
import SkillCard from '../components/SkillCard.jsx';
import OpportunityCard from '../components/OpportunityCard.jsx';
import FilterBar from '../components/FilterBar.jsx';
import WhyItFits from '../components/WhyItFits.jsx';
import PlanDayRow from '../components/PlanDayRow.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import {
  ALLOWED_SKILLS,
  INITIAL_SKILLS
} from '../data/mock.js';
import { confirmProfile } from '../api/client.js';
import {
  Sparkles,
  ArrowRight,
  MessageSquare,
  Plus,
  CheckCircle2,
  Calendar,
  RotateCcw,
  Check,
  Copy,
  ExternalLink,
  Sliders,
  X,
  UploadCloud,
  FileText,
  Trash2,
  Home, // <-- Add Home icon
} from "lucide-react";

export default function AppFlow({ state }) {
  const navigate = useNavigate();
  const {
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
    chatOpen,
    setChatOpen,
    aiTyping,
    chatMessages,
    sendChatMessage,
  } = state;

  // Mode: 'upload' or 'paste'
  const [cvInputMode, setCvInputMode] = useState("upload");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Add Skill Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState(ALLOWED_SKILLS[0]);
  const [newSkillLevel, setNewSkillLevel] = useState("working");

  // Confirm Modal state for Step 5
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
 
  // If user arrives at /app after a previous plan was already completed, reset to Step 1
  useEffect(() => {
    if (step === 5) {
      resetWorkflow();
    }
  }, []);
  // File upload reader
  const handleFileProcess = (file) => {
    if (!file) return;

    // Read as DataURL (base64) so Google Gemini can read PDFs natively
    const b64Reader = new FileReader();
    b64Reader.onload = (e) => {
      if (setUploadedFile) {
        setUploadedFile({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + " KB",
          type: file.type || "Document",
          base64: e.target?.result,
        });
      }
    };
    b64Reader.readAsDataURL(file);

    // Read as text
    const textReader = new FileReader();
    if (file.name.endsWith(".txt") || file.type.includes("text")) {
      textReader.onload = (e) => {
        setCvText(e.target?.result || "");
      };
      textReader.readAsText(file);
    } else {
      textReader.onload = (e) => {
        const raw = e.target?.result;
        if (typeof raw === "string") {
          setCvText(raw);
        } else if (raw) {
          const bytes = new Uint8Array(raw);
          let str = "";
          for (let i = 0; i < bytes.length; i++) {
            const b = bytes[i];
            if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
              str += String.fromCharCode(b);
            }
          }
          const cleaned = str
            .replace(/[^\x20-\x7E\n]/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
          setCvText(
            cleaned.length > 20 ? cleaned : `Resume document: ${file.name}`,
          );
        }
      };
      textReader.readAsArrayBuffer(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Extract skills and transition to Step 2
  const handleExtractCv = async () => {
    setIsExtracting(true);
    try {
      if (extractSkillsFromCurrentCv) {
        await extractSkillsFromCurrentCv(cvText, uploadedFile?.base64);
      }
    } finally {
      setIsExtracting(false);
      advanceToStep(2);
    }
  };

  // Add skill submit
  const handleAddSkillSubmit = (e) => {
    e.preventDefault();
    addSkill(
      newSkillName,
      newSkillLevel,
      `Verified from student input for ${newSkillName}.`,
    );
    setShowAddForm(false);
  };

  // Filtered opportunities for Step 2
  const filteredOpps = rankedOpportunities.filter((opp) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = opp.title.toLowerCase().includes(term);
      const matchOrg = opp.organization.toLowerCase().includes(term);
      const matchSkills = [...opp.required, ...opp.preferred].some((s) =>
        s.toLowerCase().includes(term),
      );
      if (!matchTitle && !matchOrg && !matchSkills) return false;
    }
    if (filterMin60 && opp.score < 60) return false;
    if (filterHideMissingReq && opp.missing.some((m) => m.isRequired))
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar with Logo and My Plans */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none block">
                CareerPath
              </span>
              <span className="text-[10px] font-semibold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                Guidance Only
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/plans"
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>My plans</span>
            </Link>

            {/* Toggle AI Chat Button */}
            <button
              type="button"
              onClick={() => setChatOpen(!chatOpen)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Adviser</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>
      {/* 5-Step Progress Bar */}
      <div className="sticky top-16 z-30 bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors py-2 px-4 sm:px-6 shadow-2xs">
        <div className="max-w-3xl mx-auto">
          <StepProgress
            currentStep={step}
            unlockedStep={unlockedStep}
            onSelectStep={goToStep}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* ==================================================== */}
        {/* STEP 1: UPLOAD OR PASTE CV                           */}
        {/* ==================================================== */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto space-y-6 pt-2 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Step 1 of 5
                </span>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Upload or paste your CV
                </h2>
              </div>

              {/* Segmented Mode Selector: Upload File vs Paste Text */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setCvInputMode("upload")}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    cvInputMode === "upload"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <UploadCloud className="w-4 h-4 text-indigo-600" />
                  <span>Upload CV File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCvInputMode("paste")}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    cvInputMode === "paste"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Paste Resume Text</span>
                </button>
              </div>

              {/* Option 1: Drag & Drop File Upload */}
              {cvInputMode === "upload" && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) =>
                      e.target.files && handleFileProcess(e.target.files[0])
                    }
                    accept=".pdf,.doc,.docx,.txt,.rtf,text/plain"
                    className="hidden"
                  />

                  {uploadedFile ? (
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {uploadedFile.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{uploadedFile.size}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />{" "}
                              File loaded & ready
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            fileInputRef.current && fileInputRef.current.click()
                          }
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (setUploadedFile) setUploadedFile(null);
                            setCvText("");
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() =>
                        fileInputRef.current && fileInputRef.current.click()
                      }
                      className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all flex flex-col items-center justify-center gap-3 ${
                        isDragOver
                          ? "border-indigo-600 bg-indigo-50/70 scale-[1.01]"
                          : "border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-slate-50"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900">
                          Click to browse or drag & drop your CV
                        </div>
                        <p className="text-xs text-slate-500">
                          Supports PDF, DOCX, TXT, or RTF (max 10 MB)
                        </p>
                      </div>
                      <span className="mt-1 px-3.5 py-1.5 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors">
                        Browse from device
                      </span>
                    </div>
                  )}

                  <div className="text-center space-y-2">
                    <button
                      type="button"
                      onClick={() => setCvInputMode("paste")}
                      className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                    >
                      Prefer to copy-paste your CV text? Switch to paste mode
                    </button>

                    <div>
                      <p className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-lg py-2 px-3.5 inline-block shadow-2xs">
                        Note: Since the AI Agent is still in development pasting a
                        CV text may work better than uploading a CV.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Option 2: Direct Textarea Paste */}
              {cvInputMode === "paste" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Paste Resume Text</span>
                    {cvText.trim() && (
                      <span className="text-[11px] text-slate-400">
                        {cvText.trim().split(/\s+/).filter(Boolean).length}{" "}
                        words • {cvText.length} characters
                      </span>
                    )}
                  </div>

                  <textarea
                    rows={11}
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    placeholder="Paste your CV text here (Education, Experience, Projects, Technical & Soft Skills)..."
                    className="w-full text-xs font-mono p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-colors leading-relaxed placeholder:text-slate-400"
                  />

                  {cvText.trim() && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setCvText("")}
                        className="text-xs text-slate-400 hover:text-red-600 font-medium transition-colors"
                      >
                        Clear text
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {!cvText.trim() && !uploadedFile
                    ? "Please upload a CV or paste your text to proceed"
                    : "Ready to extract skills"}
                </span>

                <button
                  type="button"
                  onClick={handleExtractCv}
                  disabled={(!cvText.trim() && !uploadedFile) || isExtracting}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  {isExtracting ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting your skills...</span>
                    </>
                  ) : (
                    <>
                      <span>Extract my skills</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 2: SKILLS AND LIVE MATCHING (TWO COLUMNS)       */}
        {/* ==================================================== */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Step 2 of 5
                </span>
                <h2 className="text-2xl font-bold text-slate-900">
                  Your Skills & Live Matching
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Change levels, add or remove skills. Watch opportunity cards
                  re-rank live with animated delta scores.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Add a skill</span>
                </button>

                {isReranking && (
                  <span className="text-xs text-indigo-600 font-semibold font-mono animate-pulse">
                    Recomputing fit...
                  </span>
                )}
              </div>
            </div>

            {/* Add Skill Dropdown Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddSkillSubmit}
                className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm space-y-3 animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">
                    Add a skill from allowed catalog
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    {ALLOWED_SKILLS.map((sk) => (
                      <option key={sk} value={sk}>
                        {sk}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newSkillLevel}
                    onChange={(e) => setNewSkillLevel(e.target.value)}
                    className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="working">Working</option>
                    <option value="strong">Strong</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    Add and Re-rank
                  </button>
                </div>
              </form>
            )}

            {/* TWO COLUMNS: LEFT (JOBS) vs RIGHT (SKILLS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT (FIRST): Matching opportunities (col-span-8) */}
              <div className="lg:col-span-8 space-y-3">
                <FilterBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  filterMin60={filterMin60}
                  onFilterMin60Change={setFilterMin60}
                  filterHideMissingReq={filterHideMissingReq}
                  onFilterHideMissingReqChange={setFilterHideMissingReq}
                  resultsCount={filteredOpps.length}
                />

                <div className="space-y-3">
                  {filteredOpps.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-xl text-xs text-slate-500 space-y-2">
                      <p>No opportunities match your filter criteria.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setFilterMin60(false);
                          setFilterHideMissingReq(false);
                        }}
                        className="text-indigo-600 font-semibold hover:underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : (
                    filteredOpps.map((opp, index) => (
                      <OpportunityCard
                        key={opp.id}
                        opportunity={opp}
                        rank={index + 1}
                        deltaInfo={scoreDeltas[opp.id]}
                        isSelected={selectedOppId === opp.id}
                        onSelectWhyFits={() => {
                          setSelectedOppId(opp.id);
                          advanceToStep(3);
                        }}
                        onSelectPlan={() => {
                          setSelectedOppId(opp.id);
                          advanceToStep(3); // Directs to Step 3 so they review matches before the 7-day plan
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT (NEXT TO IT): Your skills (col-span-4, narrower) */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Your Skills ({skills.filter((s) => !s.removed).length}{" "}
                    active)
                  </span>
                  <span>Click level to tune</span>
                </div>

                <div className="space-y-2.5">
                  {skills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      isHighlighted={highlightedSkillId === skill.id}
                      onLevelChange={updateSkillLevel}
                      onRemove={removeSkill}
                      onRestore={restoreSkill}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 shadow-md">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    Nothing is final until you confirm.
                  </span>{" "}
                  Adjust any skill freely.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    confirmProfile(skills);
                    advanceToStep(3);
                  }}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <span>Confirm profile and continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 3: WHY THESE MATCHES                           */}
        {/* ==================================================== */}
        {step === 3 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Step 3 of 5
              </span>
              <h2 className="text-2xl font-bold text-slate-900">
                Why these matches
              </h2>
              <p className="text-xs text-slate-500">
                Direct evidence audit pairing verbatim quotes from your resume
                against official opportunity specs.
              </p>
            </div>

            {/* Top 3 Opportunities get WhyItFits panel */}
            <div className="space-y-6">
              {rankedOpportunities.slice(0, 3).map((opp, idx) => (
                <WhyItFits
                  key={opp.id}
                  opportunity={opp}
                  rank={idx + 1}
                  skills={skills}
                  onBuildPlan={() => {
                    setSelectedOppId(opp.id);
                    setStep(4);
                  }}
                />
              ))}
            </div>

            {/* Navigation back and continue */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => advanceToStep(2)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                ← Back to Skills & Fit
              </button>

              <button
                type="button"
                onClick={() => advanceToStep(4)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-2.5 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>
                  Continue to 7-Day Plan for #
                  {rankedOpportunities.findIndex(
                    (o) => o.id === selectedOppId,
                  ) + 1}{" "}
                  {selectedOpportunity.title}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 4: RESOURCES AND 7-DAY PLAN                     */}
        {/* ==================================================== */}
        {step === 4 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Step 4 of 5
                </span>
                <h2 className="text-2xl font-bold text-slate-900">
                  7-Day Plan for {selectedOpportunity.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Targeted syllabus to close gaps for{" "}
                  {selectedOpportunity.organization}.
                </p>
              </div>

              {/* Intensity Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                {["light", "standard", "intensive"].map((intensity) => (
                  <button
                    key={intensity}
                    type="button"
                    onClick={() => setPlanIntensity(intensity)}
                    className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
                      planIntensity === intensity
                        ? "bg-white text-indigo-700 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {intensity}
                  </button>
                ))}
              </div>
            </div>

            {/* Day 1 to Day 7 Timeline (Catalog Resources removed) */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Timeline (Day 1 - Day 7)
                </span>
                <span className="font-mono tabular-nums text-indigo-700 dark:text-indigo-400 font-semibold">
                  Total:{" "}
                  {activePlan.tasks.reduce((sum, t) => sum + t.minutes, 0)}{" "}
                  minutes
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {activePlan.tasks.map((task) => (
                  <PlanDayRow
                    key={task.day}
                    task={task}
                    onUpdateTask={updateActivePlanTask}
                  />
                ))}
              </div>

              {/* Bottom Bar: Ask AI to adjust & Confirm and save */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Ask AI to adjust</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Confirm and save</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => advanceToStep(3)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                ← Back to Matches
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 5: CONFIRM AND SAVE SUCCESS STATE               */}
        {/* ==================================================== */}
        {step === 5 && (
          <div className="max-w-md mx-auto space-y-6 pt-6 text-center animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Step 5 of 5 · Complete
                </span>
                <h2 className="text-2xl font-bold text-slate-900">
                  Plan Saved!
                </h2>
                <p className="text-xs text-slate-500">
                  Your personalized 7-day study schedule is locked into browser
                  storage.
                </p>
              </div>

              {/* Plan ID Display */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Plan Reference ID
                </span>
                <div className="font-mono font-bold text-2xl text-indigo-600 tracking-wide">
                  {lastSavedPlanId}
                </div>
                <div className="text-[11px] text-slate-500">
                  Saved at {savedPlans[lastSavedPlanId]?.savedAt || "Just now"}
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/plans");
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-3 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  View plan in /plans
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(lastSavedPlanId);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied {lastSavedPlanId}!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy plan ID</span>
                    </>
                  )}
                </button>

                {/* Return to Home & Start New CV Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      resetWorkflow();
                      navigate("/");
                    }}
                    className="py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Return to Home</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetWorkflow();
                    }}
                    className="py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Analyze new CV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirm Save Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        opportunity={selectedOpportunity}
        plan={activePlan}
        onConfirmSave={() => {
          saveCurrentPlan();
          advanceToStep(5);
        }}
      />

      {/* Collapsible AI Chat Panel on Right (Bottom sheet on mobile) */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        isTyping={aiTyping}
        onSendMessage={sendChatMessage}
      />
    </div>
  );
}
