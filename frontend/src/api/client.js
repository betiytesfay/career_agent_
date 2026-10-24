/**
 * CareerPath Full-Stack API Client
 * Supports all 15 specification endpoints with automatic local fallback simulation
 * when the backend server is offline or unreachable.
 */

import {
  DEMO_CV_TEXT,
  INITIAL_SKILLS,
  OPPORTUNITIES,
  RESOURCES,
  rankAllOpportunities,
  generatePlanForOpportunity,
  extractSkillsFromCv
} from '../data/mock.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let activeSessionId = null;

export function getSessionId() {
  if (!activeSessionId) {
    activeSessionId = localStorage.getItem('careerpath-session-id') || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem('careerpath-session-id', activeSessionId);
  }
  return activeSessionId;
}

/**
 * Universal fetch wrapper with timeout and automatic error recovery
 */
async function request(endpoint, options = {}) {
  // Fail immediately when mock mode is enabled so local fallback runs without waiting
  if (import.meta.env.VITE_USE_MOCK === "true") {
    throw new Error("VITE_USE_MOCK is enabled; using local simulation.");
  }
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  console.log(`[CareerPath API] 🚀 ${options.method || "GET"} ${url}`);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": getSessionId(),
        ...(options.headers || {}),
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData.error || `HTTP error ${res.status}: ${res.statusText}`,
      );
    }

    const data = await res.json();
    console.log(`[CareerPath API] ✅ Backend responded:`, endpoint, data);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(
      `[CareerPath API] ⚠️ Request to ${url} failed or timed out: ${err.message}`,
    );
    throw err;
  }
}

// =========================================================================
// 15 SPECIFICATION ENDPOINTS
// =========================================================================

/**
 * 1. GET /health
 * Check if backend server is running
 */
export async function getHealth() {
  try {
    return await request('/health');
  } catch {
    return { status: 'offline', mode: 'frontend-client-simulation', timestamp: new Date().toISOString() };
  }
}

/**
 * 2. POST /session
 * Initialize or retrieve session state
 */
export async function startSession() {
  const sessionId = getSessionId();
  try {
    return await request('/session', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });
  } catch {
    return { sessionId, status: 'initialized-local' };
  }
}

/**
 * 3. GET /demo/cv
 * Retrieve standard demo CV text
 */
export async function getDemoCv() {
  try {
    const data = await request('/demo/cv');
    return data.cvText || data.text || DEMO_CV_TEXT;
  } catch {
    return DEMO_CV_TEXT;
  }
}

/**
 * 4. POST /cv/extract
 * Extract skills and verbatim evidence quotes from CV text
 */
export async function extractCv(cvText, pdfBase64 = null) {
  try {
    const data = await request('/cv/extract', {
      method: 'POST',
      body: JSON.stringify({ cvText, pdfBase64, sessionId: getSessionId() })
    });
    if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
      return data.skills;
    }
  } catch (err) {
    console.warn('[CareerPath API] Backend extract error, scanning CV locally:', err.message);
  }

  // Local fallback: scan actual CV text or decode from PDF base64!
  let textToScan = (cvText && typeof cvText === 'string') ? cvText : '';
  if ((!textToScan || textToScan.trim().length < 10) && pdfBase64 && typeof pdfBase64 === 'string') {
    try {
      const cleanB64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
      const binary = atob(cleanB64);
      let ascii = '';
      for (let i = 0; i < binary.length; i++) {
        const code = binary.charCodeAt(i);
        if ((code >= 32 && code <= 126) || code === 10 || code === 13) {
          ascii += binary.charAt(i);
        } else {
          ascii += ' ';
        }
      }
      textToScan = ascii.replace(/\s{2,}/g, ' ');
    } catch (e) {
      console.warn('[CareerPath API] Could not decode local PDF buffer:', e);
    }
  }

  if (textToScan && textToScan.trim().length > 10) {
    const local = extractSkillsFromCv(textToScan);
    if (local && local.length > 0) return local;
  }

  return INITIAL_SKILLS.map(s => ({ ...s, removed: false }));
}

/**
 * 5. POST /profile/correct
 * Apply conversational chat edits to candidate skills profile
 */
export async function correctProfile(message, currentSkills = []) {
  try {
    const data = await request('/profile/correct', {
      method: 'POST',
      body: JSON.stringify({ message, currentSkills, sessionId: getSessionId() })
    });
    return data;
  } catch {
    const msg = message.toLowerCase();
    let updatedSkills = [...currentSkills];
    let reply = "I've reviewed your skills adjustment.";

    if (msg.includes('excel') && (msg.includes('working') || msg.includes('lower') || msg.includes('reduce'))) {
      updatedSkills = updatedSkills.map(s => s.name === 'Excel' ? { ...s, level: 'working' } : s);
      reply = "Changed Excel to working level.";
    } else if (msg.includes('python') && (msg.includes('strong') || msg.includes('expert'))) {
      updatedSkills = updatedSkills.map(s => s.name === 'Python' ? { ...s, level: 'strong' } : s);
      reply = "Promoted Python to strong level.";
    } else if (msg.includes('sql') && (msg.includes('add') || msg.includes('have'))) {
      if (!updatedSkills.some(s => s.name.toLowerCase() === 'sql')) {
        updatedSkills.push({
          id: 'sk-sql-user',
          name: 'SQL',
          level: 'beginner',
          evidence: 'Verified from user prompt: basic SQL queries knowledge.',
          weakEvidence: false,
          removed: false
        });
        reply = "Added SQL at beginner level.";
      }
    }

    return {
      skills: updatedSkills,
      reply,
      explanation: "Local assistant simulated profile adjustment."
    };
  }
}

/**
 * 6. POST /profile/set
 * Save skills directly from manual UI controls
 */
export async function setProfileSkills(skills) {
  try {
    return await request('/profile/set', {
      method: 'POST',
      body: JSON.stringify({ skills, sessionId: getSessionId() })
    });
  } catch {
    return { ok: true, count: skills.length };
  }
}

/**
 * 7. POST /profile/confirm
 * Lock confirmed profile into session state
 */
export async function confirmProfile(skills) {
  try {
    return await request('/profile/confirm', {
      method: 'POST',
      body: JSON.stringify({ skills, sessionId: getSessionId() })
    });
  } catch {
    return { ok: true, confirmedAt: new Date().toISOString() };
  }
}

/**
 * 8. POST /opportunities/rank (Tool 1: search_and_score_opportunities)
 * Deterministic application-code scoring of opportunities
 */
export async function rankOpportunities(skills) {
  try {
    const data = await request('/opportunities/rank', {
      method: 'POST',
      body: JSON.stringify({ skills, sessionId: getSessionId() })
    });
    return data.rankedOpportunities || data.opportunities || rankAllOpportunities(skills);
  } catch {
    return rankAllOpportunities(skills);
  }
}

/**
 * 9. POST /opportunities/explain
 * Explain top opportunity fit with resume quotes and official spec references
 */
export async function explainMatches(opportunityId, skills, cvText = '') {
  try {
    const data = await request('/opportunities/explain', {
      method: 'POST',
      body: JSON.stringify({ opportunityId, skills, cvText, sessionId: getSessionId() })
    });
    return data;
  } catch {
    const opp = OPPORTUNITIES.find(o => o.id === opportunityId) || OPPORTUNITIES[0];
    return {
      opportunityId: opp.id,
      title: opp.title,
      summary: opp.whyItFits?.summary || `Strong alignment with ${opp.organization} requirements.`,
      matched: opp.whyItFits?.matched || [],
      missing: opp.whyItFits?.missing || []
    };
  }
}

/**
 * 10. POST /resources/find (Tool 2: find_learning_resources)
 * Return team-created resources addressing student's gap skills
 */
export async function findResources(gapSkills = []) {
  try {
    const data = await request('/resources/find', {
      method: 'POST',
      body: JSON.stringify({ gapSkills, sessionId: getSessionId() })
    });
    return data.resources || [];
  } catch {
    const skillSet = new Set(gapSkills.map(s => (typeof s === 'string' ? s : s.name || '').toLowerCase()));
    const matched = RESOURCES.filter(r => skillSet.has(r.tag.toLowerCase()));
    return matched.length > 0 ? matched : RESOURCES.slice(0, 3);
  }
}

/**
 * 11. POST /plan/draft
 * Draft a realistic 7-day development plan with >= 3 activities
 */
export async function draftPlan({ opportunity, skills, gapSkills = [], intensity = 'standard' }) {
  try {
    const data = await request('/plan/draft', {
      method: 'POST',
      body: JSON.stringify({
        opportunityId: opportunity?.id,
        opportunity,
        skills,
        gapSkills,
        intensity,
        sessionId: getSessionId()
      })
    });
    return data.plan || data;
  } catch {
    return generatePlanForOpportunity(opportunity, skills, intensity);
  }
}

/**
 * 12. POST /plan/edit
 * Adjust the draft plan via natural language instructions
 */
export async function editPlan({ plan, prompt, intensity = 'standard' }) {
  try {
    const data = await request('/plan/edit', {
      method: 'POST',
      body: JSON.stringify({ plan, prompt, intensity, sessionId: getSessionId() })
    });
    return data.plan || data;
  } catch {
    const pLower = (prompt || '').toLowerCase();
    if (plan && plan.tasks && (pLower.includes('light') || pLower.includes('reduce') || pLower.includes('less time'))) {
      return {
        ...plan,
        tasks: plan.tasks.map(t => ({
          ...t,
          minutes: Math.max(15, Math.round(t.minutes * 0.75))
        }))
      };
    }
    return plan;
  }
}

/**
 * 13. POST /plan/save (Tool 3: save_development_plan)
 * Persist approved 7-day plan with activities, resources & completion status
 */
export async function savePlan({ opportunity, plan, intensity }) {
  try {
    const data = await request('/plan/save', {
      method: 'POST',
      body: JSON.stringify({
        opportunity,
        plan,
        intensity,
        sessionId: getSessionId()
      })
    });
    return data;
  } catch {
    const planId = `PLAN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const record = {
      planId,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      organization: opportunity.organization,
      intensity,
      tasks: plan.tasks,
      savedAt: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      createdAt: new Date().toISOString()
    };

    const stored = JSON.parse(localStorage.getItem('careerpath-saved-plans') || '{}');
    stored[planId] = record;
    localStorage.setItem('careerpath-saved-plans', JSON.stringify(stored));

    return { planId, status: 'saved-local', plan: record };
  }
}

/**
 * 14. GET /plan/:plan_id
 * Retrieve previously saved plan for reopening
 */
export async function getPlan(planId) {
  try {
    const data = await request(`/plan/${encodeURIComponent(planId)}`);
    return data.plan || data;
  } catch {
    const stored = JSON.parse(localStorage.getItem('careerpath-saved-plans') || '{}');
    return stored[planId] || null;
  }
}

/**
 * 15. PATCH /plan/:plan_id/activity/:n
 * Update completion status of specific activity
 */
export async function updateActivityStatus(planId, dayNumber, done) {
  try {
    return await request(`/plan/${encodeURIComponent(planId)}/activity/${dayNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ done })
    });
  } catch {
    const stored = JSON.parse(localStorage.getItem('careerpath-saved-plans') || '{}');
    if (stored[planId]) {
      stored[planId].tasks = stored[planId].tasks.map(t =>
        t.day === Number(dayNumber) ? { ...t, done: Boolean(done) } : t
      );
      localStorage.setItem('careerpath-saved-plans', JSON.stringify(stored));
    }
    return { ok: true, planId, day: dayNumber, done };
  }
}
