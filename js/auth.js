// Safely attach configuration to window to prevent global constant redeclaration errors
window.SUPABASE_URL = window.SUPABASE_URL || 'https://tpeqgjgeeyrepaijdcuj.supabase.co';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwZXFnamdlZXlyZXBhaWpkY3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NzczMjMsImV4cCI6MjEwNDE1MzMyM30.YEAcpOlAiaFdYHniMZdzM684NYiF5fVPVXUaRGWraC4';

// Initialize the shared Supabase client instance
if (!window.db && typeof supabase !== 'undefined') {
  window.db = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
}

const db = window.db;
let currentUserProfile = null;

/**
 * Checks authentication status without forcing a redirect.
 * Dispatches a custom event 'authReady' when profile load completes.
 */
async function initAuth(forceRedirect = false) {
  if (!db) {
    console.error('Supabase client failed to initialize. Ensure Supabase JS library is loaded.');
    return null;
  }

  try {
    const { data: { session }, error } = await db.auth.getSession();

    if (error || !session) {
      if (forceRedirect) {
        window.location.href = 'login.html';
      }
      dispatchAuthReadyEvent(null);
      return null;
    }

    // Fetch username profile from Supabase database table
    const { data: profile } = await db
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    currentUserProfile = profile;
    updateHeaderNav(profile ? profile.username : 'User');
    dispatchAuthReadyEvent(session.user);
    return session.user;
  } catch (err) {
    console.error('Auth initialization error:', err);
    dispatchAuthReadyEvent(null);
    return null;
  }
}

/**
 * Dispatches custom event to notify page scripts when auth state is resolved.
 */
function dispatchAuthReadyEvent(user) {
  window.dispatchEvent(new CustomEvent('authReady', { detail: { user, profile: currentUserProfile } }));
}

/**
 * Updates header navigation with user info and logout button
 */
function updateHeaderNav(username) {
  const nav = document.querySelector('header nav');
  if (!nav) return;

  // 1. Update existing "Account" link text
  const accountLink = nav.querySelector('a[href="account.html"]');
  if (accountLink) {
    accountLink.textContent = `@${username}`;
    accountLink.classList.add('user-logged-in');
  }

  // 2. Append Logout button if not already added
  if (!document.getElementById('logoutBtn')) {
    const logoutBtn = document.createElement('a');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.href = '#';
    logoutBtn.style.color = '#ef4444';
    logoutBtn.style.marginLeft = '1.5rem';
    logoutBtn.textContent = 'Logout';
    
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await db.auth.signOut();
      window.location.href = 'login.html';
    });

    nav.appendChild(logoutBtn);
  }
}

// Ensure the DOM is fully loaded before executing auth checks
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initAuth(false));
} else {
  initAuth(false);
}
