// ============================================================
// EPHIS MAIN.JS — PRODUCTION BUILD (Improved + Safe Login)
// ============================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ---------- CONFIGURATION ----------
const SUPABASE_URL = "https://rpnqjdfnybklbuxmfucw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnFqZGZueWJrbGJ1eG1mdWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODY5NzQsImV4cCI6MjA3ODI2Mjk3NH0.soaHvoxWUNbEYRLmyYhHufQR0qyPmWqBoUt8wDpPDjw";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// ======================================================
// 2. AUTH FUNCTIONS (Login / Logout / Session Check)
// ======================================================
export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    showToast("Logout failed: " + error.message, "error");
  } else {
    showToast("Logged out successfully", "success");
    setTimeout(() => (window.location.href = "login.html"), 800);
  }
}

export async function requireLogin() {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) window.location.href = "login.html";
  return data.user;
}

// ======================================================
// 3. TOAST NOTIFICATIONS (Top Center)
// ======================================================
export function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === "error" ? "#e53935" : type === "success" ? "#43a047" : "#1976d2"};
    color: white;
    padding: 0.6rem 1.2rem;
    border-radius: 6px;
    z-index: 10000;
    font-size: 0.9rem;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => (toast.style.opacity = "1"), 50);
  setTimeout(() => toast.remove(), 4000);
}

// ======================================================
// 4. UNIVERSAL CRUD HELPERS
// ======================================================
export async function fetchAll(table, columns = "*") {
  const { data, error } = await supabase.from(table).select(columns).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchById(table, id) {
  const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function insertRecord(table, payload) {
  const { error } = await supabase.from(table).insert(payload);
  if (error) throw error;
  return true;
}

export async function updateRecord(table, id, payload) {
  const { error } = await supabase.from(table).update(payload).eq("id", id);
  if (error) throw error;
  return true;
}

export async function deleteRecord(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
  return true;
}

// ======================================================
// 5. THEME HANDLING (Light/Dark)
// ======================================================
export function applyTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.body.dataset.theme = theme;
  if (theme === "dark") {
    document.body.style.background = "#121212";
    document.body.style.color = "#f1f1f1";
  } else {
    document.body.style.background = "#f5f6fa";
    document.body.style.color = "#222";
  }
}

export function toggleTheme() {
  const theme = localStorage.getItem("theme") === "dark" ? "light" : "dark";
  localStorage.setItem("theme", theme);
  applyTheme();
}

// Auto-apply theme on load
applyTheme();

// ======================================================
// 6. FORM UTILITY HELPERS
// ======================================================
export function populateForm(form, data) {
  for (const key in data) {
    if (form.elements[key]) form.elements[key].value = data[key] || "";
  }
}

export function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

// ======================================================
// 7. NAVIGATION HELPERS
// ======================================================
export function goBack(page = "dashboard.html") {
  window.location.href = page;
}

// ======================================================
// 8. MODULE INITIALIZATION
// ======================================================
// When a module wants to auto-load data (like complaints.html)
document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.module;
  if (!page) return;

  await requireLogin(); // Protect all module pages

  switch (page) {
    case "complaints":
      console.log("Complaints module ready");
      break;
    case "premises":
      console.log("Premises management module ready");
      break;
    case "inspections":
      console.log("Inspections module ready");
      break;
    default:
      console.log("EPHIS main.js loaded");
  }
});
