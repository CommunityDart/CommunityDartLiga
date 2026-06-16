// ============================================
// SUPABASE CONFIG
// ============================================
const SUPABASE_CONFIG = {
  url: "https://ppxwnqbovrnvzkcpyrcj.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweHducWJvdnJudnprY3B5cmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0OTEyMTksImV4cCI6MjA5NzA2NzIxOX0.wRDVNxLBx2QHz6hFC59rn1xZgEkxyf1NM6fc8ki-3-Q"
};

// ============================================
// GOOGLE SHEETS CONFIG
// ============================================
const SHEETS_CONFIG = {
  sheetId: "1P8aN20vfu6MLnMaEMXLv_OvOeXiF76-dAW1Fpy4DNe0",
  sheets: {
    playerDiscord: "Spieler_Discord",
    rules: "Regelwerk",
    news: "Neuigkeiten",
    links: "Links"
  },
  leagues: [
    "Autodarts Liga 1", "Autodarts Liga 2", "Autodarts Liga 3",
    "Autodarts Liga 4", "Autodarts Liga 5", "Autodarts Liga 6",
    "DartCounter Liga 1", "DartCounter Liga 2", "DartCounter Liga 3",
    "DartCounter Liga 4", "DartCounter Liga 5", "DartCounter Liga 6"
  ]
};

// ============================================
// DISCORD CONFIG
// ============================================
const DISCORD_CONFIG = {
  invite: "https://discord.gg/DEINLINK"
};

// ============================================
// THEMES (für Mode-Farben)
// ============================================
const THEMES = {
  Autodarts: {
    accent: "#20b7ff",
    accentBorder: "rgba(32,183,255,.42)"
  },
  DartCounter: {
    accent: "#ff9f1c",
    accentBorder: "rgba(255,159,28,.42)"
  },
  Home: {
    accent: "#20b7ff",
    accentBorder: "rgba(32,183,255,.42)"
  }
};
