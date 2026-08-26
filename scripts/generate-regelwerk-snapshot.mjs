// scripts/generate-regelwerk-snapshot.mjs
//
// Zweck: Holt NUR den Regelwerk-Text aus Supabase (system_settings.regelwerk_html)
// und schreibt ihn als statisches HTML zwischen die SNAPSHOT:REGELWERK-Marker
// in index.html. Rührt die SNAPSHOT:NEWS-Marker NICHT an - die bleiben, wie sie
// sind (aktuell der handgeschriebene Fallback-Text).
//
// Läuft nur bei Bedarf (manuell per GitHub Actions "Run workflow"), nicht auf
// einem festen Zeitplan - das Regelwerk ändert sich selten, ein täglicher Lauf
// wäre unnötig.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ppxwnqbovrnvzkcpyrcj.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const INDEX_PATH = process.env.INDEX_PATH || "index.html";

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

async function fetchRegelwerkHtml() {
  const { data: sys, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error("Fehler beim Laden des Regelwerks: " + error.message);
  }

  const rulesText = sys?.regelwerk_html || sys?.rules || sys?.regelwerk || sys?.rules_text || "";
  if (!rulesText) {
    throw new Error("Kein Regelwerk-Text in system_settings gefunden - Abbruch, um den Fallback-Text nicht mit Leerinhalt zu überschreiben.");
  }

  return rulesText.includes("<p>")
    ? rulesText
    : `<div style="white-space: pre-wrap; line-height: 1.6; font-size:14px;">${htmlEscape(rulesText)}</div>`;
}

async function main() {
  let html = readFileSync(INDEX_PATH, "utf-8");

  const regelwerkHtml = await fetchRegelwerkHtml();
  html = replaceBetweenMarkers(html, "<!-- SNAPSHOT:REGELWERK:START -->", "<!-- SNAPSHOT:REGELWERK:END -->", regelwerkHtml);

  writeFileSync(INDEX_PATH, html, "utf-8");
  console.log("✅ Regelwerk-Snapshot erfolgreich in " + INDEX_PATH + " geschrieben.");
}

main().catch((err) => {
  console.error("❌ Regelwerk-Snapshot fehlgeschlagen:", err);
  process.exit(1);
});
