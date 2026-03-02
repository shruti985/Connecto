// ============================================================
// connections.js  —  handles Connect button + Notification bell
// Include this script in your FindBuddies page (and Navbar)
// ============================================================

const API_BASE = "/api"; // adjust if your API has a different prefix

// ─── UTILITY ────────────────────────────────────────────────

function getAuthToken() {
  // Adjust this to wherever you store the JWT (localStorage / sessionStorage / cookie)
  return localStorage.getItem("token");
}

async function apiFetch(url, options = {}) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  });
  return res.json();
}

// ─── CONNECT BUTTON ─────────────────────────────────────────

/**
 * Call this when the page loads to wire up all "+ Connect" buttons.
 * Each button should have:
 *   data-user-id="<receiverUserId>"
 *   data-connection-status="none|pending|accepted"  (optional, set server-side)
 */
function initConnectButtons() {
  document.querySelectorAll(".connect-btn").forEach((btn) => {
    const userId = btn.dataset.userId;
    if (!userId) return;

    // Set initial visual state if status is already known
    const status = btn.dataset.connectionStatus || "none";
    setButtonState(btn, status);

    btn.addEventListener("click", () => handleConnectClick(btn, userId));
  });
}

async function handleConnectClick(btn, receiverId) {
  // Prevent double-clicks
  if (btn.disabled) return;
  btn.disabled = true;

  try {
    const data = await apiFetch(`/connections/send/${receiverId}`, {
      method: "POST",
    });

    if (data.success) {
      setButtonState(btn, "pending");
      showToast("Connection request sent! ✓");
    } else {
      // Already sent / already connected
      showToast(data.message || "Could not send request", "error");
      btn.disabled = false;
    }
  } catch (err) {
    console.error("Connect error:", err);
    showToast("Something went wrong", "error");
    btn.disabled = false;
  }
}

function setButtonState(btn, status) {
  btn.classList.remove("btn-connect", "btn-pending", "btn-connected");

  switch (status) {
    case "none":
      btn.textContent = "+ Connect";
      btn.classList.add("btn-connect");
      btn.disabled = false;
      break;
    case "pending":
      btn.textContent = "✓ Request Sent";
      btn.classList.add("btn-pending");
      btn.disabled = true;
      break;
    case "accepted":
      btn.textContent = "✓ Connected";
      btn.classList.add("btn-connected");
      btn.disabled = true;
      break;
  }
}

// ─── NOTIFICATION BELL ──────────────────────────────────────

let notificationInterval = null;

function initNotificationBell() {
  const bell = document.getElementById("notification-bell");
  const dropdown = document.getElementById("notification-dropdown");

  if (!bell) return;

  // Fetch count immediately on load
  fetchNotificationCount();

  // Poll every 30 seconds for new notifications
  notificationInterval = setInterval(fetchNotificationCount, 30000);

  // Toggle dropdown on bell click
  bell.addEventListener("click", async (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains("open");

    if (isOpen) {
      dropdown.classList.remove("open");
    } else {
      await loadNotificationDropdown();
      dropdown.classList.add("open");
      // Mark all as read after opening
      await apiFetch("/notifications/mark-read", { method: "PUT" });
      // Reset badge
      setBadgeCount(0);
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", () => {
    dropdown?.classList.remove("open");
  });
}

async function fetchNotificationCount() {
  try {
    const data = await apiFetch("/notifications");
    if (data.success) {
      setBadgeCount(data.unreadCount);
    }
  } catch (err) {
    console.error("Notification count error:", err);
  }
}

async function loadNotificationDropdown() {
  const list = document.getElementById("notification-list");
  if (!list) return;

  list.innerHTML = `<div class="notif-loading">Loading...</div>`;

  try {
    const data = await apiFetch("/notifications");

    if (!data.success || data.notifications.length === 0) {
      list.innerHTML = `<div class="notif-empty">No notifications yet 🔔</div>`;
      return;
    }

    list.innerHTML = data.notifications
      .map((n) => renderNotificationItem(n))
      .join("");
  } catch (err) {
    list.innerHTML = `<div class="notif-error">Failed to load notifications</div>`;
  }
}

function renderNotificationItem(n) {
  const timeAgo = formatTimeAgo(new Date(n.created_at));
  const unreadClass = !n.is_read ? "notif-unread" : "";
  const avatar = n.sender_pic
    ? `<img src="${n.sender_pic}" alt="${n.sender_name}" />`
    : `<div class="notif-avatar-placeholder">${(n.sender_name || "?")[0].toUpperCase()}</div>`;

  return `
    <div class="notif-item ${unreadClass}" data-id="${n.id}">
      <div class="notif-avatar">${avatar}</div>
      <div class="notif-body">
        <p class="notif-message">${escapeHtml(n.message)}</p>
        <span class="notif-time">${timeAgo}</span>
      </div>
      ${!n.is_read ? '<span class="notif-dot"></span>' : ""}
    </div>
  `;
}

function setBadgeCount(count) {
  const badge = document.getElementById("notif-badge");
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

// ─── HELPERS ────────────────────────────────────────────────

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  // Remove after 3s
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── INIT ────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initConnectButtons();
  initNotificationBell();
});