// scripts/generate-news-snapshot.mjs
//
// Zweck: Holt die letzten News-Beiträge aus Supabase und schreibt sie als
// statisches HTML zwischen die SNAPSHOT:NEWS-Marker in index.html. Rührt die
// SNAPSHOT:REGELWERK-Marker NICHT an - die werden von einem eigenen Skript
// (generate-regelwerk-snapshot.mjs) gepflegt.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ppxwnqbovrnvzkcpyrcj.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const INDEX_PATH = process.env.INDEX_PATH || "index.html";
const NEWS_LIMIT = 10; // Snapshot muss nicht die komplette Historie enthalten - die Live-Seite lädt eh alles nach.

if (!SUPABASE_ANON_KEY) {
  console.error("Fehler: SUPABASE_ANON_KEY ist nicht gesetzt (GitHub Secret fehlt).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function htmlEscape(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Rein kosmetisch: Zeilenumbrüche nach schließenden Block-Tags, damit der
// News-Inhalt im GitHub-Dateiviewer lesbar bleibt statt eine Endlos-Zeile zu sein.
// Ändert NICHTS an der Darstellung im Browser.
function prettifyHtml(html) {
  return html
    .replace(/(<\/(?:p|div|li|ul|ol|h1|h2|h3|h4|h5|h6|blockquote|table|tr)>)/gi, "$1\n")
    .replace(/(<br\s*\/?>)/gi, "$1\n")
    .trim();
}

function replaceBetweenMarkers(html, startMarker, endMarker, newContent) {
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Marker nicht gefunden oder in falscher Reihenfolge: ${startMarker} / ${endMarker}`);
  }
  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  return `${before}\n${newContent}\n${after}`;
}

async function fetchNewsHtml() {
  const { data: news, error } = await supabase
    .from("news")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(NEWS_LIMIT);

  if (error) {
    throw new Error("Fehler beim Laden der News: " + error.message);
  }
  if (!news || news.length === 0) {
    return `<div class="empty">Noch keine Neuigkeiten vorhanden.</div>`;
  }

  const itemsHtml = news
    .map((n) => {
      const dateStr = n.created_at
        ? new Date(n.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
        : "";
      return `<div class="news-item">
  <div class="news-date">${htmlEscape(dateStr)}</div>
  <div class="news-title">${htmlEscape(n.title)}</div>
  <div class="news-content">${n.content || ""}</div>
</div>`;
    })
    .join("\n");

  return prettifyHtml(itemsHtml);
}

async function main() {
  let html = readFileSync(INDEX_PATH, "utf-8");

  const newsHtml = await fetchNewsHtml();
  html = replaceBetweenMarkers(html, "<!-- SNAPSHOT:NEWS:START -->", "<!-- SNAPSHOT:NEWS:END -->", newsHtml);

  writeFileSync(INDEX_PATH, html, "utf-8");
  console.log("✅ News-Snapshot erfolgreich in " + INDEX_PATH + " geschrieben.");
}

main().catch((err) => {
  console.error("❌ News-Snapshot fehlgeschlagen:", err);
  process.exit(1);
});
