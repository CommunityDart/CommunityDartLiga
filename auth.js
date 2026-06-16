// ============================================
// SUPABASE AUTH CLIENT (Singleton)
// ============================================
let supabaseClient = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    if (typeof supabase === 'undefined') {
      console.error("Supabase library not loaded");
      return null;
    }
    supabaseClient = supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );
  }
  return supabaseClient;
}

// ============================================
// AUTH STATE MANAGEMENT
// ============================================
const authState = {
  user: null,
  profile: null,
  isLoading: true,
  listeners: []
};

function onAuthChange(callback) {
  authState.listeners.push(callback);
}

function notifyAuthChange() {
  authState.listeners.forEach(listener => listener(authState.user, authState.profile));
}

// ============================================
// CHECK CURRENT SESSION
// ============================================
async function initAuth() {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    // 1. Hole aktuelle Session
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    
    if (sessionError) {
      console.warn("Session error:", sessionError);
    }

    if (session?.user) {
      authState.user = session.user;
      await loadUserProfile(session.user.id);
    }

    // 2. Höre auf zukünftige Auth-Changes
    client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        authState.user = session.user;
        await loadUserProfile(session.user.id);
        
        // Bei OAuth-Redirect: gehe zu Profil
        if (event === 'SIGNED_IN' && window.location.hash.includes("access_token")) {
          window.location.href = "profil.html";
        }
      } else {
        authState.user = null;
        authState.profile = null;
      }
      
      notifyAuthChange();
    });

  } catch (err) {
    console.error("Auth init error:", err);
  } finally {
    authState.isLoading = false;
  }
}

// ============================================
// LOAD USER PROFILE
// ============================================
async function loadUserProfile(userId) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Kein Profil vorhanden -> wird bei ersten Besuch erstellt
      authState.profile = null;
    } else if (error) {
      console.error("Profile load error:", error);
      authState.profile = null;
    } else {
      authState.profile = data;
    }
  } catch (err) {
    console.error("Unexpected error loading profile:", err);
    authState.profile = null;
  }
}

// ============================================
// DISCORD LOGIN
// ============================================
async function signInWithDiscord() {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) {
      console.error("Discord sign-in error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Unexpected error during sign-in:", err);
    return false;
  }
}

// ============================================
// LOGOUT
// ============================================
async function signOut() {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.auth.signOut();
    if (error) {
      console.error("Sign-out error:", error);
      return false;
    }
    authState.user = null;
    authState.profile = null;
    notifyAuthChange();
    return true;
  } catch (err) {
    console.error("Unexpected error during sign-out:", err);
    return false;
  }
}

// ============================================
// UPDATE PROFILE
// ============================================
async function updateUserProfile(updates) {
  const client = getSupabaseClient();
  if (!client || !authState.user) {
    console.error("No authenticated user");
    return { success: false, error: "Nicht angemeldet" };
  }

  try {
    const dataToUpdate = {
      id: authState.user.id,
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('profiles')
      .upsert(dataToUpdate)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    authState.profile = data;
    notifyAuthChange();
    return { success: true, profile: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================
// HELPER: Ist User authentifiziert?
// ============================================
function isAuthenticated() {
  return !!authState.user;
}

// ============================================
// HELPER: Hat User vollständiges Profil?
// ============================================
function hasCompleteProfile() {
  if (!authState.profile) return false;
  return !!authState.profile.real_name && !!authState.profile.zip_code;
}

// Starte Auth beim Laden
document.addEventListener('DOMContentLoaded', initAuth);
