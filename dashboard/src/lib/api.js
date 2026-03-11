const key = () => localStorage.getItem("dashboard_key") || "";

const h = () => ({ "Content-Type": "application/json", "x-dashboard-key": key() });

async function req(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: h(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

export const api = {
  // ── Standup ──────────────────────────────────────────────────────────────
  getStandups:   (limit = 20, offset = 0) => req("GET", `/api/standup?limit=${limit}&offset=${offset}`),
  getStreak:     ()                        => req("GET", "/api/standup/streak"),
  updateStandup: (id, data)                => req("PUT", `/api/standup/${id}`, data),
  deleteStandup: (id)                      => req("DELETE", `/api/standup/${id}`),
  exportXlsx: async () => {
    const res = await fetch("/api/standup/export.xlsx", {
      headers: { "x-dashboard-key": key() },
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `standup-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Review (legacy, still used on dashboard) ────────────────────────────
  getReviews:    ()       => req("GET", "/api/review/all"),
  addReview:     (data)   => req("POST", "/api/review", data),
  updateReview:  (id, d)  => req("PUT", `/api/review/${id}`, d),
  doneReview:    (id)     => req("PATCH", `/api/review/${id}/done`),
  reopenReview:  (id)     => req("PATCH", `/api/review/${id}/reopen`),
  deleteReview:  (id)     => req("DELETE", `/api/review/${id}`),

  // ── Competitions ────────────────────────────────────────────────────────
  getCompetitions:   ()         => req("GET", "/api/competitions"),
  getCompetition:    (id)       => req("GET", `/api/competitions/${id}`),
  createCompetition: (data)     => req("POST", "/api/competitions", data),
  updateCompetition: (id, data) => req("PUT", `/api/competitions/${id}`, data),
  deleteCompetition: (id)       => req("DELETE", `/api/competitions/${id}`),

  // ── Challenges ──────────────────────────────────────────────────────────
  getChallenges:     (params = {}) => {
    const qs = new URLSearchParams();
    if (params.status)   qs.set("status", params.status);
    if (params.category) qs.set("category", params.category);
    if (params.comp_id)  qs.set("comp_id", params.comp_id);
    if (params.limit)    qs.set("limit", params.limit);
    if (params.offset)   qs.set("offset", params.offset);
    return req("GET", `/api/challenges?${qs.toString()}`);
  },
  getChallengeStats: ()             => req("GET", "/api/challenges/stats"),
  getChallengeMeta:  ()             => req("GET", "/api/challenges/meta"),
  getChallenge:      (id)           => req("GET", `/api/challenges/${id}`),
  createChallenge:   (data)         => req("POST", "/api/challenges", data),
  updateChallenge:   (id, data)     => req("PUT", `/api/challenges/${id}`, data),
  setChallengeStatus:(id, status)   => req("PATCH", `/api/challenges/${id}/status`, { status }),
  addChallengeNote:  (id, note)     => req("PATCH", `/api/challenges/${id}/note`, { note }),
  linkChallenge:     (id, comp_id)  => req("PATCH", `/api/challenges/${id}/link`, { comp_id }),
  deleteChallenge:   (id)           => req("DELETE", `/api/challenges/${id}`),
};
