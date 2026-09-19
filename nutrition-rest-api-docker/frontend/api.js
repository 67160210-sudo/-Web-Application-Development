const API_BASE = "http://localhost:8000/api";

async function api(path, options = {}) {
  const token = sessionStorage.getItem("access_token");
  const headers = {"Content-Type": "application/json", ...(options.headers || {})};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, {...options, headers});
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "API request failed");
  return data;
}
