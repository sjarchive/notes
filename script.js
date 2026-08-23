/* ===================== Auth ===================== */

const USERNAME_REGEX = /^[a-zA-Z0-9_]{5,10}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;

const EYE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>';

const EYE_OFF_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-4.22 5.61M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function togglePassword(fieldId, btn) {

    const input = document.getElementById(fieldId);

    if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = EYE_OFF_ICON;
        btn.setAttribute("aria-label", "Hide password");
    } else {
        input.type = "password";
        btn.innerHTML = EYE_ICON;
        btn.setAttribute("aria-label", "Show password");
    }

}

document.querySelectorAll(".toggle-password").forEach(btn => {
    btn.innerHTML = EYE_ICON;
});

function switchAuthTab(tab) {

    const loginTabBtn = document.getElementById("loginTabBtn");
    const signupTabBtn = document.getElementById("signupTabBtn");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    const authError = document.getElementById("authError");
    authError.textContent = "";
    authError.classList.remove("auth-success");

    if (tab === "login") {
        loginTabBtn.classList.add("active");
        signupTabBtn.classList.remove("active");
        loginForm.classList.remove("hidden-form");
        signupForm.classList.add("hidden-form");
    } else {
        signupTabBtn.classList.add("active");
        loginTabBtn.classList.remove("active");
        signupForm.classList.remove("hidden-form");
        loginForm.classList.add("hidden-form");
    }

}

function showAuthError(message) {
    const authError = document.getElementById("authError");
    authError.textContent = message;
    authError.classList.remove("auth-success");
}

function showAuthSuccess(message) {
    const authError = document.getElementById("authError");
    authError.textContent = message;
    authError.classList.add("auth-success");
}

function friendlyAuthError(error) {

    const msg = (error && error.message) ? error.message.toLowerCase() : "";

    if (msg.includes("already registered") || msg.includes("already exists")) {
        return "That username is already taken.";
    }
    if (msg.includes("invalid login credentials")) {
        return "Incorrect username or password.";
    }
    if (msg.includes("password")) {
        return "Password must be at least 6 characters.";
    }

    return "Something went wrong. Please try again.";

}

async function handleSignup(event) {

    event.preventDefault();

    const username = document.getElementById("signupUsername").value.trim();
    const password = document.getElementById("signupPassword").value;

    if (!USERNAME_REGEX.test(username)) {
        showAuthError("Username must be 5–10 characters: letters, numbers, underscores only.");
        return false;
    }

    if (!PASSWORD_REGEX.test(password)) {
        showAuthError("Password must be 8–20 characters with an uppercase letter, lowercase letter, number, and special character.");
        return false;
    }

    showAuthError("");

    suppressAuthTransition = true;

    const { error } = await supabaseClient.auth.signUp({
        email: usernameToEmail(username),
        password: password,
        options: {
            data: { username: username }
        }
    });

    if (error) {
        suppressAuthTransition = false;
        showAuthError(friendlyAuthError(error));
        return false;
    }

    await supabaseClient.auth.signOut();

    suppressAuthTransition = false;
    document.getElementById("signupForm").reset();
    switchAuthTab("login");
    showAuthSuccess("Account created! Please log in.");

    return false;

}

async function handleLogin(event) {

    event.preventDefault();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    showAuthError("");

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: usernameToEmail(username),
        password: password
    });

    if (error) {
        showAuthError(friendlyAuthError(error));
    }

    return false;

}

function handleLogout() {
    supabaseClient.auth.signOut();
}

let authInitialized = false;
let suppressAuthTransition = false;

supabaseClient.auth.onAuthStateChange((event, session) => {

    if (suppressAuthTransition) {
        return;
    }

    const user = session ? session.user : null;

    const authBox = document.getElementById("authBox");
    const home = document.getElementById("homeScreen");
    const notes = document.getElementById("notesSection");
    const logoutBtn = document.getElementById("logoutBtn");

    if (user) {

        logoutBtn.classList.remove("hidden");

        if (!authInitialized) {

            /* Already had a session from before (page reload) — skip straight to notes, no animation */
            home.style.display = "none";
            notes.classList.remove("hidden");
            notes.classList.add("notes-visible");

        } else {

            /* Just logged in this session — animate the transition into notes */
            enterApp();

        }

    } else {

        logoutBtn.classList.add("hidden");

        if (authInitialized && !notes.classList.contains("hidden")) {

            /* Just logged out this session — animate notes fading out, then reveal login screen */
            leaveApp();

        } else {

            /* Initial load with no session — show login screen immediately, no animation */
            authBox.classList.remove("hidden-form");

            home.style.display = "";
            home.classList.remove("hide-home");

            notes.classList.remove("notes-visible");
            notes.classList.add("hidden");

        }

    }

    authInitialized = true;

});

/* Enter App */

function enterApp() {

    const home = document.getElementById("homeScreen");
    const notes = document.getElementById("notesSection");

    home.classList.add("hide-home");

    setTimeout(() => {
        home.style.display = "none";
        notes.classList.remove("hidden");
        notes.classList.add("notes-visible");
    }, 400);

}

/* Leave App (Logout transition) */

function leaveApp() {

    const home = document.getElementById("homeScreen");
    const notes = document.getElementById("notesSection");
    const authBox = document.getElementById("authBox");

    notes.classList.add("leaving");

    setTimeout(() => {

        notes.classList.remove("notes-visible");
        notes.classList.remove("leaving");
        notes.classList.add("hidden");

        authBox.classList.remove("hidden-form");
        switchAuthTab("login");

        home.style.display = "";
        home.classList.remove("hide-home");

    }, 200);

}

document.addEventListener("DOMContentLoaded", () => {

/* Subject Counter */

const cards = document.querySelectorAll(".note-card");

document.getElementById("subjectCount").textContent =
    `Total Subjects: ${cards.length}`;

/* Dark Mode */

const toggle = document.getElementById("themeToggle");

if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
    toggle.textContent = "☀️ Light Mode";
}

toggle.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    const dark =
        document.body.classList.contains("dark");

    localStorage.setItem("darkMode", dark);

    toggle.textContent =
        dark
            ? "☀️ Light Mode"
            : "🌙 Dark Mode";

});

/* Scroll To Top Button */

const topBtn = document.getElementById("topBtn");

window.addEventListener("scroll", () => {

    topBtn.style.display =
        window.scrollY > 200
            ? "block"
            : "none";

});

topBtn.addEventListener("click", () => {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

});

});

/* Preview PDF */

/* File access via Supabase Storage (private bucket) */

const ACCESS_LINK_EXPIRY_SECONDS = 60 * 5;    // 5 minutes — clicked immediately by a logged-in user (view/download)
const SHARE_LINK_EXPIRY_SECONDS = 60 * 30;    // 30 minutes — needs time to reach and be opened by someone else

async function getSignedFileUrl(file, expiresIn) {

    const { data, error } = await supabaseClient
        .storage
        .from(NOTES_BUCKET)
        .createSignedUrl(file, expiresIn);

    if (error) {
        showToast("⚠️ Couldn't load file");
        return null;
    }

    return data.signedUrl;

}

async function previewPDF(file) {

    const url = await getSignedFileUrl(file, ACCESS_LINK_EXPIRY_SECONDS);

    if (url) {
        window.open(url, "_blank");
    }

}

/* Download PDF */

async function downloadPDF(file) {

    const url = await getSignedFileUrl(file, ACCESS_LINK_EXPIRY_SECONDS);

    if (!url) {
        return;
    }

    try {

        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = blobUrl;
        a.download = file;

        document.body.appendChild(a);

        a.click();

        a.remove();

        URL.revokeObjectURL(blobUrl);

        showToast("✓ Download started");

    } catch {

        showToast("⚠️ Download failed");

    }

}

/* Share PDF Link */

async function shareFile(file) {

    const url = await getSignedFileUrl(file, SHARE_LINK_EXPIRY_SECONDS);

    if (!url) {
        return;
    }

    try {

        await navigator.clipboard.writeText(url);

        showToast("🔗 Link copied (valid for 30 minutes)");

    } catch {

        showToast("⚠️ Copy failed — share manually");

    }

}

/* Toast Notification */

function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}

/* Disable Right Click */

document.addEventListener(
    "contextmenu",
    function (e) {
        e.preventDefault();
    }
);

/* Disable Dragging */

document.addEventListener(
    "dragstart",
    function (e) {
        e.preventDefault();
    }
);

/* Disable Text Selection */

document.addEventListener(
    "selectstart",
    function (e) {
        e.preventDefault();
    }
);

/* Disable Common Developer Shortcuts */

document.addEventListener(
    "keydown",
    function (e) {

        if (
            e.key === "F12" ||

            (e.ctrlKey &&
                e.shiftKey &&
                e.key === "I") ||

            (e.ctrlKey &&
                e.shiftKey &&
                e.key === "J") ||

            (e.ctrlKey &&
                e.key === "U")
        ) {
            e.preventDefault();
        }

    }
);

/* Collapsible Cards */

function toggleCard(card) {

    const allCards =
        document.querySelectorAll(".note-card");

    allCards.forEach(c => {

        if (c !== card) {

            c.classList.remove("active");

            const arrow = c.querySelector(".arrow");

            if (arrow) {
                arrow.textContent = "▼";
            }

        }

    });

    card.classList.toggle("active");

    const arrow = card.querySelector(".arrow");

    arrow.textContent =
        card.classList.contains("active")
            ? "▲"
            : "▼";

}

/* Splash Screen */

window.addEventListener(
    "load",
    () => {

        setTimeout(() => {

            document
                .getElementById("splash")
                .classList.add("hide");

        }, 1200);

    }
);
