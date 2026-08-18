const $ = selector => document.querySelector(selector);

const clearV2Storage = () => {
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith("v2:")) sessionStorage.removeItem(key);
  }
};

const showGate = message => {
  document.body.classList.remove("auth-pending");
  document.body.classList.add("auth-locked");
  $("#accessGate").classList.remove("hidden");
  $("#loginError").textContent = message;
  $("#loginPassword").focus();
};

window.addEventListener("demo-auth-required", () => showGate("Your session expired. Sign in again to continue; this tab's workspace state is preserved."));

const unlock = async status => {
  $("#accessGate").classList.add("hidden");
  $("#logoutButton").classList.toggle("hidden", !status.aiEnabled);
  $("#modeStatus").textContent = status.aiEnabled ? "AI gateway available · policy drafting enabled" : "Deterministic-only mode";
  document.documentElement.dataset.aiEnabled = String(status.aiEnabled);
  await import("./app.js");
  document.body.classList.remove("auth-pending", "auth-locked");
};

const loadSession = async () => {
  try {
    const response = await fetch("/api/session", { credentials: "same-origin" });
    if (response.status === 404) return unlock({ aiEnabled: false, modelDisplayName: null });
    if (!response.ok) throw new Error();
    const status = await response.json();
    if (status.aiEnabled && !status.authenticated) return showGate("");
    await unlock(status);
  } catch {
    showGate("Session status is unavailable. Reload to try again.");
  }
};

$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  $("#loginError").textContent = "";
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: $("#loginPassword").value })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error?.message || "Login failed");
    }
    window.location.reload();
  } catch (error) {
    $("#loginError").textContent = error instanceof Error ? error.message : "Login failed";
  }
});

$("#logoutButton").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    if (!response.ok) throw new Error();
    clearV2Storage();
    window.location.reload();
  } catch {
    $("#modeStatus").textContent = "Logout could not be completed";
  }
});

loadSession();
