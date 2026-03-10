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
  // Standup
  getStandups:  (limit = 20, offset = 0) => req("GET", `/api/standup?limit=${limit}&offset=${offset}`),
  getStreak:    ()                        => req("GET", "/api/standup/streak"),
  updateStandup:(id, data)                => req("PUT", `/api/standup/${id}`, data),
  deleteStandup:(id)                      => req("DELETE", `/api/standup/${id}`),
  exportXlsx:   ()                        => { window.open(`/api/standup/export.xlsx`, "_blank"); },

  // Review
  getReviews:   ()       => req("GET", "/api/review/all"),
  addReview:    (data)   => req("POST", "/api/review", data),
  updateReview: (id, d)  => req("PUT", `/api/review/${id}`, d),
  doneReview:   (id)     => req("PATCH", `/api/review/${id}/done`),
  reopenReview: (id)     => req("PATCH", `/api/review/${id}/reopen`),
  deleteReview: (id)     => req("DELETE", `/api/review/${id}`),
};
