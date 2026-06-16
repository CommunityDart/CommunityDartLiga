// ============================================
// HTML ESCAPING
// ============================================
function htmlEscape(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================
// TEXT NORMALIZATION
// ============================================
function normalize(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// ============================================
// GOOGLE SHEETS CSV PARSING
// ============================================
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = "";
      } else if (char === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (char !== '\r') {
        cell += char;
      }
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function csvUrl(sheetName) {
  const { sheetId, sheets } = SHEETS_CONFIG;
  
  if (sheetName === sheets.playerDiscord) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=2009950588`;
  }
  
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

async function loadCsv(sheetName) {
  try {
    const response = await fetch(csvUrl(sheetName));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return parseCsv(text);
  } catch (err) {
    console.warn(`Could not load sheet "${sheetName}":`, err);
    return [];
  }
}

function safeCell(row, index) {
  return row && row[index] !== undefined ? String(row[index]).trim() : "";
}

function rowHasContent(row) {
  return row && row.some(cell => normalize(cell) !== "");
}

// ============================================
// LINK DETECTION & MAKING
// ============================================
function makeClickable(text) {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    return `<a href="${htmlEscape(url)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent); text-decoration:underline; word-break:break-all;">${htmlEscape(url)}</a>`;
  });
}

// ============================================
// DOM HELPERS
// ============================================
function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function on(element, event, handler) {
  if (element) {
    element.addEventListener(event, handler);
  }
}

function onAll(selector, event, handler) {
  $$(selector).forEach(el => on(el, event, handler));
}

// ============================================
// MODAL MANAGEMENT
// ============================================
function openModal(modalId) {
  const modal = $(modalId);
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeModal(modalId) {
  const modal = $(modalId);
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

// ============================================
// TOAST / NOTIFICATIONS
// ============================================
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  const style = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 800;
    z-index: 9999;
    animation: slideIn 0.3s ease;
  `;
  
  const typeStyles = {
    success: 'background: #3ddc97; color: #000;',
    error: 'background: #e74c3c; color: #fff;',
    info: 'background: #20b7ff; color: #000;'
  };
  
  toast.setAttribute('style', style + (typeStyles[type] || typeStyles.info));
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================
// FORMATTING
// ============================================
function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString('de-DE');
}

function formatAvg(avg) {
  if (!avg) return "-";
  return parseFloat(avg).toFixed(2);
}

// ============================================
// DEBOUNCE
// ============================================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================
// LOCAL STORAGE HELPERS
// ============================================
function getStoredValue(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (err) {
    return defaultValue;
  }
}

function setStoredValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error("Storage error:", err);
    return false;
  }
}

function removeStoredValue(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    return false;
  }
}
