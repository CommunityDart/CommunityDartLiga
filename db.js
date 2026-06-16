// ============================================
// PROFILE OPERATIONS
// ============================================

/**
 * Erstelle oder aktualisiere ein Profil basierend auf Discord-Daten
 */
async function initializeProfileFromDiscord(user) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // Versuche vorhandenes Profil zu laden
    let { data: existing, error: loadError } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Falls Profil existiert -> gib es zurück
    if (existing) {
      return existing;
    }

    // Falls nicht existent, erstelle neues Profil
    const newProfile = {
      id: user.id,
      discord_id: user.user_metadata?.provider_id || user.id,
      username: user.user_metadata?.full_name || user.user_metadata?.name || "Spieler",
      email: user.email,
      avatar_url: user.user_metadata?.avatar_url,
      role: 'user'
    };

    const { data: created, error: insertError } = await client
      .from('profiles')
      .insert([newProfile])
      .select()
      .single();

    if (insertError) {
      console.error("Profile creation error:", insertError);
      return null;
    }

    return created;
  } catch (err) {
    console.error("Unexpected error initializing profile:", err);
    return null;
  }
}

/**
 * Validiere Profil-Daten vor dem Speichern
 */
function validateProfileData(data) {
  const errors = [];

  // Pflichtfelder
  if (!data.real_name || !data.real_name.trim()) {
    errors.push("Echter Name ist erforderlich");
  }
  if (!data.zip_code || !data.zip_code.trim()) {
    errors.push("Postleitzahl ist erforderlich");
  }

  // Spielmodi-Validierung: Wenn Name angegeben, muss AVG auch angegeben sein
  if (data.autodarts_name?.trim() && !data.autodarts_avg) {
    errors.push("Autodarts AVG erforderlich, wenn Autodarts Name angegeben");
  }
  if (data.dartcounter_name?.trim() && !data.dartcounter_avg) {
    errors.push("DartCounter AVG erforderlich, wenn DartCounter Name angegeben");
  }
  if (data.scolia_name?.trim() && !data.scolia_avg) {
    errors.push("Scolia AVG erforderlich, wenn Scolia Name angegeben");
  }

  // Mindestens ein Spielmodus sollte ausgefüllt sein
  const hasSomeMode = 
    data.autodarts_name?.trim() || 
    data.dartcounter_name?.trim() || 
    data.scolia_name?.trim();

  if (!hasSomeMode) {
    errors.push("Mindestens einen Spielmodus ausfüllen (Autodarts, DartCounter oder Scolia)");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================
// SPIELER-LISTING
// ============================================

/**
 * Lade alle öffentlichen Spieler (für Spielerverzeichnis)
 */
async function getAllPublicPlayers(filters = {}) {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    let query = client
      .from('profiles')
      .select('id, username, avatar_url, real_name, zip_code, autodarts_name, autodarts_avg, dartcounter_name, dartcounter_avg, scolia_name, scolia_avg, created_at')
      .not('real_name', 'is', null);  // Nur vollständige Profile

    // Optional: Nach Postleitzahl filtern (für Mitgliederkarte später)
    if (filters.zip_code) {
      query = query.eq('zip_code', filters.zip_code);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading players:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Unexpected error loading players:", err);
    return [];
  }
}

/**
 * Lade Spieler gruppiert nach Postleitzahl (für Mitgliederkarte)
 */
async function getPlayersByZipCode() {
  const client = getSupabaseClient();
  if (!client) return {};

  try {
    const { data, error } = await client
      .from('profiles')
      .select('zip_code, real_name, username, avatar_url')
      .not('zip_code', 'is', null)
      .not('real_name', 'is', null);

    if (error) {
      console.error("Error loading players by zip:", error);
      return {};
    }

    // Gruppiere nach Postleitzahl
    const grouped = {};
    (data || []).forEach(player => {
      if (!grouped[player.zip_code]) {
        grouped[player.zip_code] = [];
      }
      grouped[player.zip_code].push(player);
    });

    return grouped;
  } catch (err) {
    console.error("Unexpected error:", err);
    return {};
  }
}

// ============================================
// UTILITY: String Cleaning
// ============================================

/**
 * Säubere und normalisiere Eingaben
 */
function cleanInput(value) {
  return (value || "").trim();
}

/**
 * Konvertiere zu Float oder null
 */
function parseFloat2Decimals(value) {
  const num = parseFloat(value);
  return isNaN(num) ? null : parseFloat(num.toFixed(2));
}

/**
 * Validiere und säubere Postleitzahl (5-stellig für DE)
 */
function validateZipCode(zipCode) {
  const cleaned = cleanInput(zipCode);
  if (!/^\d{5}$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

// ============================================
// STATISTIKEN
// ============================================

/**
 * Berechne Statistiken (z.B. Anzahl Spieler, Durchschnitts-AVG)
 */
async function getPlayerStatistics() {
  const players = await getAllPublicPlayers();
  
  if (players.length === 0) {
    return {
      totalPlayers: 0,
      withAutodarts: 0,
      withDartCounter: 0,
      withScolia: 0,
      avgAutodarts: 0,
      avgDartCounter: 0,
      avgScolia: 0
    };
  }

  const autodartsPlayers = players.filter(p => p.autodarts_avg);
  const dartcounterPlayers = players.filter(p => p.dartcounter_avg);
  const scholiaPlayers = players.filter(p => p.scolia_avg);

  const calcAvg = (arr, field) => {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((acc, p) => acc + (p[field] || 0), 0);
    return (sum / arr.length).toFixed(2);
  };

  return {
    totalPlayers: players.length,
    withAutodarts: autodartsPlayers.length,
    withDartCounter: dartcounterPlayers.length,
    withScolia: scholiaPlayers.length,
    avgAutodarts: calcAvg(autodartsPlayers, 'autodarts_avg'),
    avgDartCounter: calcAvg(dartcounterPlayers, 'dartcounter_avg'),
    avgScolia: calcAvg(scholiaPlayers, 'scolia_avg')
  };
}
