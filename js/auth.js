const SUPABASE_URL = 'https://tpeqgjgeeyrepaijdcuj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwZXFnamdlZXlyZXBhaWpkY3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NzczMjMsImV4cCI6MjEwNDE1MzMyM30.YEAcpOlAiaFdYHniMZdzM684NYiF5fVPVXUaRGWraC4';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

let currentUserProfile = null;

/**
 * Checks authentication status without forcing a redirect.
 * Dispatches a custom event 'authReady' when profile load completes.
 */
async function initAuth(forceRedirect = false) {
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
 * Updates header navigation with user info and logout button using addEventListener
 */
function updateHeaderNav(username) {
  const nav = document.querySelector('header nav');
  if (nav && !document.getElementById('logoutBtn')) {
    const userBadge = document.createElement('span');
    userBadge.style.cssText = 'color: var(--accent-color); font-weight: bold; margin-left: 1rem;';
    userBadge.textContent = `@${username}`;

    const logoutBtn = document.createElement('a');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.href = '#';
    logoutBtn.style.color = '#ef4444';
    logoutBtn.textContent = 'Logout';
    
    // Use addEventListener instead of inline .onclick for CSP compliance
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await db.auth.signOut();
      window.location.href = 'login.html';
    });

    nav.appendChild(userBadge);
    nav.appendChild(logoutBtn);
  }
}

// Automatically initialize auth on load (does NOT force redirect on open pages)
initAuth(false);
