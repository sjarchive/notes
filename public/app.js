
/* ===================== Configuration ===================== */
const SUPABASE_URL = "https://eztspowxxwxhavhpkthm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dHNwb3d4eHd4aGF2aHBrdGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MzI2MTYsImV4cCI6MjEwMzAwODYxNn0.fVnX45GDjT8HMVXSAm5Xucr8J6PCJ9AQ4vkjmJLNeRE";
const supabaseClient = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const NOTES_BUCKET = "notes";
const USERNAME_DOMAIN = "bednotes.local";
const ADMIN_USER_ID = "3672bb51-947d-4d8d-a1a8-72a4413be136";

function usernameToEmail(username) {
    return username.trim().toLowerCase() + "@" + USERNAME_DOMAIN;
}

/* ===================== Auth & UI State ===================== */
const USERNAME_REGEX = /^[a-zA-Z0-9_]{5,10}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;

const EYE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-4.22 5.61M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

let authInitialized = false;
let suppressAuthTransition = false;
let currentSession = null;
let authSubmitIntent = false;
let appTransitionTimer = null;

function togglePassword(fieldId, btn) {
    const input = document.getElementById(fieldId);
    if (!input) return;
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
    loginForm.reset();
    signupForm.reset();

    document.querySelectorAll(".password-wrap input").forEach(input => {
        input.type = "password";
    });
    document.querySelectorAll(".toggle-password").forEach(btn => {
        btn.innerHTML = EYE_ICON;
        btn.setAttribute("aria-label", "Show password");
    });

    const isLogin = tab === "login";
    loginTabBtn.classList.toggle("active", isLogin);
    signupTabBtn.classList.toggle("active", !isLogin);
    loginForm.classList.toggle("hidden-form", !isLogin);
    signupForm.classList.toggle("hidden-form", isLogin);
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
        return "Password must be 8–20 characters with uppercase, lowercase, number & special character.";
    }
    return "Something went wrong. Please try again.";
}

async function handleSignup(event) {
    event.preventDefault();
    if (!supabaseClient) {
        showAuthError("Service unavailable. Please refresh.");
        return false;
    }

    const submitBtn = document.getElementById("signupSubmitBtn");
    if (submitBtn.disabled) return false;

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
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing up…";
    suppressAuthTransition = true;

    try {
        const { error } = await supabaseClient.auth.signUp({
            email: usernameToEmail(username),
            password: password,
            options: { data: { username: username } }
        });

        if (error) {
            suppressAuthTransition = false;
            showAuthError(friendlyAuthError(error));
            return false;
        }

        try {
            await supabaseClient.auth.signOut();
        } finally {
            suppressAuthTransition = false;
        }

        document.getElementById("signupForm").reset();
        switchAuthTab("login");
        document.getElementById("loginUsername").value = username;
        document.getElementById("loginPassword").value = "";
        document.getElementById("loginPassword").focus();
        showAuthSuccess("Account created! Please log in.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign Up";
    }
    return false;
}

async function handleLogin(event) {
    event.preventDefault();
    if (!supabaseClient) {
        showAuthError("Service unavailable. Please refresh.");
        return false;
    }

    const submitBtn = document.getElementById("loginSubmitBtn");
    if (submitBtn.disabled) return false;

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    showAuthError("");
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in…";
    authSubmitIntent = true;

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email: usernameToEmail(username),
            password: password
        });

        if (error) {
            authSubmitIntent = false;
            showAuthError(friendlyAuthError(error));
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Log In";
    }
    return false;
}

function handleLogout() {
    if (supabaseClient) {
        supabaseClient.auth.signOut();
    }
}

function handleEnterClick() {
    if (currentSession) {
        enterApp();
    } else {
        openAuthModal();
    }
}

/* ===================== Scroll Lock & Modal Positioning ===================== */
let scrollLockCount = 0;

function lockBodyScroll() {
    if (scrollLockCount === 0) {
        const root = document.documentElement;
        const gap = window.innerWidth - root.clientWidth;
        if (gap > 0) {
            root.style.paddingRight = gap + "px";
        }
        root.classList.add("scroll-locked");
    }
    scrollLockCount++;
}

function unlockBodyScroll() {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
        const root = document.documentElement;
        root.classList.remove("scroll-locked");
        root.style.paddingRight = "";
    }
}

function closeOverlayElement(overlay) {
    if (!overlay || overlay.classList.contains("hidden-form")) {
        return;
    }
    if (overlay.contains(document.activeElement)) {
        document.activeElement.blur();
    }
    overlay.classList.add("hidden-form");
    clearTimeout(overlay._kbTimer);
    overlay._kbTimer = undefined;
    overlay._lastH = undefined;
    overlay.classList.remove("kb-animating");
    overlay.style.paddingTop = "";
    overlay.style.paddingBottom = "";
    unlockBodyScroll();
}

function openAuthModal() {
    const overlay = document.getElementById("authModalOverlay");
    const wasHidden = overlay.classList.contains("hidden-form");
    overlay.classList.remove("hidden-form");
    switchAuthTab("login");
    repositionAuthModal();
    if (wasHidden) {
        lockBodyScroll();
    }
}

function closeAuthModal() {
    closeOverlayElement(document.getElementById("authModalOverlay"));
}

function closeAuthModalOnOverlay(event) {
    if (event.target.id === "authModalOverlay") {
        closeAuthModal();
    }
}

let _repositionRafId = 0;
const MODAL_OVERLAY_IDS = ["authModalOverlay", "manageModal1Overlay", "manageModal2Overlay"];

function repositionAuthModal() {
    if (!window.visualViewport || _repositionRafId) {
        return;
    }
    _repositionRafId = requestAnimationFrame(() => {
        _repositionRafId = 0;
        const vv = window.visualViewport;
        const layoutH = window.innerHeight;
        MODAL_OVERLAY_IDS.forEach(id => {
            const overlay = document.getElementById(id);
            if (!overlay || overlay.classList.contains("hidden-form")) {
                return;
            }
            if (overlay._lastH !== undefined && Math.abs(vv.height - overlay._lastH) > 60) {
                overlay.classList.add("kb-animating");
                clearTimeout(overlay._kbTimer);
                overlay._kbTimer = setTimeout(() => {
                    overlay.classList.remove("kb-animating");
                }, 280);
            }
            overlay._lastH = vv.height;
            /* Keep the dim/blur backdrop static (it always covers the whole
               screen) and instead resize the flex content area so it exactly
               matches the visible band of the visual viewport. This keeps the
               modal centered above the keyboard and lets max-height constrain
               it to the visible area instead of hiding behind it. */
            const visibleTop = Math.max(0, vv.offsetTop);
            const visibleBottom = Math.max(0, layoutH - vv.offsetTop - vv.height);
            overlay.style.paddingTop = (visibleTop + 16) + "px";
            overlay.style.paddingBottom = (visibleBottom + 16) + "px";
        });
    });
}

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", repositionAuthModal, { passive: true });
    window.visualViewport.addEventListener("scroll", repositionAuthModal, { passive: true });
}

document.querySelectorAll("#authModalOverlay input, #manageModal1Overlay input").forEach(input => {
    input.addEventListener("focus", () => {
        setTimeout(() => {
            repositionAuthModal();
            input.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 250);
    });
    input.addEventListener("blur", () => {
        setTimeout(repositionAuthModal, 250);
    });
});

function toggleProfileMenu(event) {
    event.stopPropagation();
    document.getElementById("profileMenu").classList.toggle("hidden-form");
}

document.addEventListener("click", (event) => {
    const container = document.getElementById("profileContainer");
    const menu = document.getElementById("profileMenu");
    if (container && !container.contains(event.target)) {
        menu.classList.add("hidden-form");
    }
});

function updateManageNotesButton() {
    const button = document.getElementById("manageNotesBtn");
    const notes = document.getElementById("notesSection");
    const user = currentSession ? currentSession.user : null;
    const isAdmin = Boolean(user && user.id === ADMIN_USER_ID && !notes.classList.contains("hidden"));
    const onYear1 = !document.getElementById("year1View").classList.contains("hidden");
    const onYear2 = !document.getElementById("year2View").classList.contains("hidden");
    const activeYear = onYear2 ? 2 : (onYear1 ? 1 : 0);

    button.classList.toggle("hidden-form", !(isAdmin && activeYear));
    if (activeYear) {
        button.textContent = activeYear === 2
            ? "🗂 Manage II Year Notes"
            : "🗂 Manage I Year Notes";
        button.onclick = () => openManageModal(activeYear);
    }
}

if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (suppressAuthTransition) {
            return;
        }
        currentSession = session;
        const user = session ? session.user : null;
        const home = document.getElementById("homeScreen");
        const notes = document.getElementById("notesSection");
        const profileContainer = document.getElementById("profileContainer");
        const profileUsername = document.getElementById("profileUsername");
        const profileMenu = document.getElementById("profileMenu");

        if (user) {
            const username =
                (user.user_metadata && user.user_metadata.username) ||
                (user.email ? user.email.split("@")[0] : "User");
            profileUsername.textContent = username;
            profileContainer.classList.remove("hidden");
            updateManageNotesButton();
            closeAuthModal();

            if (authInitialized && event === "SIGNED_IN" && authSubmitIntent) {
                authSubmitIntent = false;
                if (notes.classList.contains("hidden")) {
                    enterApp();
                }
            } else if (event === "SIGNED_IN") {
                authSubmitIntent = false;
            }
        } else {
            profileContainer.classList.add("hidden");
            profileMenu.classList.add("hidden-form");
            document.getElementById("manageNotesBtn").classList.add("hidden-form");
            closeManageModal();

            if (authInitialized && !notes.classList.contains("hidden")) {
                leaveApp();
            } else {
                clearTimeout(appTransitionTimer);
                home.style.display = "";
                home.classList.remove("hide-home");
                notes.classList.remove("notes-visible", "leaving");
                notes.classList.add("hidden");
            }
        }
        authInitialized = true;
    });
}

function enterApp() {
    const home = document.getElementById("homeScreen");
    const notes = document.getElementById("notesSection");
    clearTimeout(appTransitionTimer);
    notes.classList.remove("leaving");
    home.classList.add("hide-home");
    appTransitionTimer = setTimeout(() => {
        home.style.display = "none";
        notes.classList.remove("hidden");
        notes.classList.add("notes-visible");
        showYearSelect();
        updateManageNotesButton();
    }, 280);
}

function leaveApp() {
    const home = document.getElementById("homeScreen");
    const notes = document.getElementById("notesSection");
    clearTimeout(appTransitionTimer);
    notes.classList.add("leaving");
    updateManageNotesButton();
    const backBtn = document.getElementById("backToYearsBtn");
    if (backBtn) {
        backBtn.classList.add("hidden");
    }
    appTransitionTimer = setTimeout(() => {
        notes.classList.remove("notes-visible", "leaving");
        notes.classList.add("hidden");
        home.style.display = "";
        home.classList.remove("hide-home");
    }, 180);
}

/* ===================== Year Navigation ===================== */
const YEAR_VIEW_IDS = ["yearSelectView", "year1View", "year2View"];

function showYearView(viewId) {
    YEAR_VIEW_IDS.forEach(id => {
        document.getElementById(id).classList.toggle("hidden", id !== viewId);
    });
    const view = document.getElementById(viewId);
    const enteringClass = viewId === "year1View" ? "entering-fade" : "entering";

    if (view._onEnterEnd) {
        view.removeEventListener("animationend", view._onEnterEnd);
        view._onEnterEnd = null;
    }
    view.classList.remove("entering", "entering-fade");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
        void view.offsetWidth;
        view.classList.add(enteringClass);
        const onEnterEnd = (e) => {
            if (e.target !== view) return;
            view.classList.remove("entering", "entering-fade");
            view.removeEventListener("animationend", onEnterEnd);
            view._onEnterEnd = null;
        };
        view._onEnterEnd = onEnterEnd;
        view.addEventListener("animationend", onEnterEnd);
    }

    const backBtn = document.getElementById("backToYearsBtn");
    if (backBtn) {
        backBtn.classList.toggle("hidden", viewId === "yearSelectView");
    }
    updateManageNotesButton();
    window.scrollTo({ top: 0, behavior: "instant" });
}

function showYearSelect() {
    showYearView("yearSelectView");
}

/* ===================== Initialization, Theme & Scroll ===================== */
document.addEventListener("DOMContentLoaded", () => {
    loadNotes();

    /* Dismiss splash screen snappily as soon as DOM is interactive */
    setTimeout(() => {
        const splash = document.getElementById("splash");
        if (splash) splash.classList.add("hide");
    }, 650);

    const toggle = document.getElementById("themeToggle");
    if (document.body.classList.contains("dark")) {
        toggle.textContent = "☀️ Light Mode";
    }

    toggle.addEventListener("click", () => {
        const dark = document.body.classList.toggle("dark");
        document.documentElement.style.background = dark ? "#121212" : "";
        localStorage.setItem("darkMode", dark);
        toggle.textContent = dark ? "☀️ Light Mode" : "🌙 Dark Mode";
    });

    const topBtn = document.getElementById("topBtn");
    let topBtnVisible = false;
    window.addEventListener("scroll", () => {
        const shouldShow = window.scrollY > 200;
        if (shouldShow !== topBtnVisible) {
            topBtnVisible = shouldShow;
            topBtn.style.display = shouldShow ? "block" : "none";
        }
    }, { passive: true });

    topBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});

/* ===================== Notes Data & Grid ===================== */
let notesCache = [];

async function loadNotes() {
    if (!supabaseClient) {
        showToast("⚠️ Couldn't load notes list");
        return;
    }
    const { data, error } = await supabaseClient
        .from("notes")
        .select("*")
        .order("position", { ascending: true });

    if (error) {
        showToast("⚠️ Couldn't load notes list");
        return;
    }
    notesCache = data || [];
    renderNotesGrid();
    renderManageList();
}

function withTapFeedback(button, originalLabel, action) {
    return async () => {
        if (button.disabled) return;
        button.disabled = true;
        button.textContent = "⏳ " + originalLabel.replace(/^\S+\s/, "");
        try {
            await action();
        } finally {
            button.disabled = false;
            button.textContent = originalLabel;
        }
    };
}

function renderNotesGrid() {
    const grid = document.getElementById("notesGrid");
    const fragment = document.createDocumentFragment();
    clickRaisedCard = null;

    notesCache.forEach(note => {
        const card = document.createElement("div");
        card.className = "note-card";

        const h2 = document.createElement("h2");
        const arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.textContent = "▼";
        h2.append(arrow, note.title);

        card.addEventListener("click", (event) => {
            raiseCard(card);
            clickRaisedCard = card;
            if (event.target.closest(".actions")) {
                return;
            }
            toggleCard(card);
        });

        card.addEventListener("mouseenter", () => raiseCard(card));
        card.addEventListener("mouseleave", () => {
            if (clickRaisedCard !== card) {
                card.classList.remove("raised");
            }
        });

        const actions = document.createElement("div");
        actions.className = "actions";

        const actionsInner = document.createElement("div");
        actionsInner.className = "actions-inner";

        const previewBtn = document.createElement("button");
        previewBtn.type = "button";
        previewBtn.className = "preview-btn";
        previewBtn.setAttribute("aria-label", `View ${note.title} PDF`);
        previewBtn.textContent = "👁 View";
        previewBtn.addEventListener("click", withTapFeedback(previewBtn, "👁 View", () => previewPDF(note.filename)));

        const downloadBtn = document.createElement("button");
        downloadBtn.type = "button";
        downloadBtn.className = "download-btn";
        downloadBtn.setAttribute("aria-label", `Download ${note.title} PDF`);
        downloadBtn.textContent = "⬇ Download";
        downloadBtn.addEventListener("click", withTapFeedback(downloadBtn, "⬇ Download", () => downloadPDF(note.filename)));

        const shareBtn = document.createElement("button");
        shareBtn.type = "button";
        shareBtn.className = "share-btn";
        shareBtn.setAttribute("aria-label", `Share ${note.title} PDF`);
        shareBtn.textContent = "🔗 Share";
        shareBtn.addEventListener("click", withTapFeedback(shareBtn, "🔗 Share", () => shareFile(note.filename)));

        actionsInner.append(previewBtn, downloadBtn, shareBtn);
        actions.appendChild(actionsInner);
        card.append(h2, actions);
        fragment.appendChild(card);
    });

    grid.replaceChildren(fragment);

    document.getElementById("subjectCount").textContent = `Total Subjects: ${notesCache.length}`;
    const year1Count = document.getElementById("year1Count");
    if (year1Count) {
        year1Count.textContent = `${notesCache.length} subject${notesCache.length === 1 ? "" : "s"} →`;
    }
}

/* ===================== Manage Notes (Admin) ===================== */
let manageActionInFlight = false;

function openManageModal(year) {
    const overlayId = year === 2 ? "manageModal2Overlay" : "manageModal1Overlay";
    const overlay = document.getElementById(overlayId);
    const wasHidden = overlay.classList.contains("hidden-form");

    document.getElementById("profileMenu").classList.add("hidden-form");
    overlay.classList.remove("hidden-form");
    document.getElementById("manageStatus").textContent = "";
    renderManageList();
    repositionAuthModal();
    if (wasHidden) {
        lockBodyScroll();
    }
}

function closeManageModal() {
    ["manageModal1Overlay", "manageModal2Overlay"].forEach(id => {
        closeOverlayElement(document.getElementById(id));
    });
}

function closeManageModalOnOverlay(event) {
    if (event.target.id === "manageModal1Overlay" || event.target.id === "manageModal2Overlay") {
        closeManageModal();
    }
}

function showManageStatus(message, isError = true) {
    const el = document.getElementById("manageStatus");
    el.textContent = message;
    el.classList.toggle("auth-success", !isError);
}

async function handleAddNote(event) {
    event.preventDefault();
    if (manageActionInFlight) return false;

    const titleInput = document.getElementById("newNoteTitle");
    const fileInput = document.getElementById("newNoteFile");
    const submitBtn = document.getElementById("addNoteSubmitBtn");
    const title = titleInput.value.trim();
    const file = fileInput.files[0];

    if (!title) {
        showManageStatus("Please enter a title.");
        return false;
    }
    if (!file || (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) {
        showManageStatus("Please choose a PDF file.");
        return false;
    }

    manageActionInFlight = true;
    submitBtn.disabled = true;
    showManageStatus("Uploading…", false);
    const filename = file.name;

    try {
        const { error: uploadError } = await supabaseClient
            .storage
            .from(NOTES_BUCKET)
            .upload(filename, file, { contentType: "application/pdf" });

        if (uploadError) {
            showManageStatus("Upload failed: " + uploadError.message);
            return false;
        }

        const nextPosition = notesCache.length
            ? Math.max(...notesCache.map((n, i) => n.position ?? i)) + 1
            : 0;

        const { error: insertError } = await supabaseClient
            .from("notes")
            .insert({ title, filename, position: nextPosition });

        if (insertError) {
            await supabaseClient.storage.from(NOTES_BUCKET).remove([filename]);
            showManageStatus("Couldn't save note: " + insertError.message);
            return false;
        }

        titleInput.value = "";
        fileInput.value = "";
        showManageStatus("✓ Note added.", false);
        await loadNotes();
    } finally {
        manageActionInFlight = false;
        submitBtn.disabled = false;
    }
    return false;
}

async function handleDeleteNote(id, filename, title) {
    if (manageActionInFlight) return;
    if (!confirm(`Delete "${title}" and its PDF? This can't be undone.`)) {
        return;
    }

    manageActionInFlight = true;
    showManageStatus("Deleting…", false);

    try {
        const { error: dbError } = await supabaseClient
            .from("notes")
            .delete()
            .eq("id", id);

        if (dbError) {
            showManageStatus("Couldn't delete note record: " + dbError.message);
            return;
        }

        const stillReferenced = notesCache.some(n => n.id !== id && n.filename === filename);
        if (!stillReferenced) {
            const { error: storageError } = await supabaseClient
                .storage
                .from(NOTES_BUCKET)
                .remove([filename]);

            if (storageError) {
                showManageStatus("Note removed, but file cleanup failed: " + storageError.message);
                await loadNotes();
                return;
            }
        }

        showManageStatus("✓ Note deleted.", false);
        await loadNotes();
    } finally {
        manageActionInFlight = false;
    }
}

async function moveNote(noteId, direction) {
    if (manageActionInFlight) return;
    const currentIndex = notesCache.findIndex(note => note.id === noteId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= notesCache.length) {
        return;
    }

    manageActionInFlight = true;
    showManageStatus("Saving order…", false);

    try {
        const current = notesCache[currentIndex];
        const target = notesCache[targetIndex];
        const hasDuplicatePositions =
            new Set(notesCache.map(n => n.position)).size !== notesCache.length ||
            current.position == null ||
            target.position == null;

        let results;
        if (hasDuplicatePositions) {
            const reordered = notesCache.slice();
            reordered[currentIndex] = target;
            reordered[targetIndex] = current;
            results = await Promise.all(
                reordered.map((note, idx) =>
                    supabaseClient.from("notes").update({ position: idx }).eq("id", note.id)
                )
            );
        } else {
            results = await Promise.all([
                supabaseClient.from("notes").update({ position: target.position }).eq("id", current.id),
                supabaseClient.from("notes").update({ position: current.position }).eq("id", target.id)
            ]);
        }

        const error = results.find(result => result.error)?.error;
        if (error) {
            showManageStatus("Couldn't save order: " + error.message);
            return;
        }

        showManageStatus("✓ Note order saved.", false);
        await loadNotes();
    } finally {
        manageActionInFlight = false;
    }
}

function renderManageList() {
    const list = document.getElementById("manageNotesList");
    if (!list) return;

    const fragment = document.createDocumentFragment();
    notesCache.forEach((note, index) => {
        const row = document.createElement("div");
        row.className = "manage-note-row";

        const label = document.createElement("span");
        label.textContent = note.title;

        const controls = document.createElement("div");
        controls.className = "manage-note-controls";

        const moveUp = document.createElement("button");
        moveUp.type = "button";
        moveUp.className = "manage-move-btn";
        moveUp.textContent = "↑";
        moveUp.setAttribute("aria-label", `Move ${note.title} up`);
        moveUp.disabled = index === 0;
        moveUp.addEventListener("click", () => moveNote(note.id, -1));

        const moveDown = document.createElement("button");
        moveDown.type = "button";
        moveDown.className = "manage-move-btn";
        moveDown.textContent = "↓";
        moveDown.setAttribute("aria-label", `Move ${note.title} down`);
        moveDown.disabled = index === notesCache.length - 1;
        moveDown.addEventListener("click", () => moveNote(note.id, 1));

        const del = document.createElement("button");
        del.type = "button";
        del.className = "manage-delete-btn";
        del.textContent = "🗑";
        del.setAttribute("aria-label", `Delete ${note.title}`);
        del.addEventListener("click", () => handleDeleteNote(note.id, note.filename, note.title));

        controls.append(moveUp, moveDown, del);
        row.append(label, controls);
        fragment.appendChild(row);
    });

    list.replaceChildren(fragment);
}

/* ===================== File Access (Preview / Download / Share) ===================== */
async function getSignedFileUrl(file, kind) {
    const accessToken = currentSession?.access_token;
    if (!accessToken) {
        showToast("🔒 Please log in again");
        return null;
    }
    try {
        const res = await fetch(`/sign?file=${encodeURIComponent(file)}&kind=${encodeURIComponent(kind)}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        if (!res.ok) {
            showToast("⚠️ Couldn't load file");
            return null;
        }
        const { url } = await res.json();
        return url || null;
    } catch {
        showToast("⚠️ Couldn't load file");
        return null;
    }
}

async function previewPDF(file) {
    const newTab = window.open("", "_blank");
    const url = await getSignedFileUrl(file, "access");
    if (!url) {
        if (newTab) newTab.close();
        return;
    }
    if (newTab) {
        newTab.location.href = url;
    } else {
        window.location.href = url;
    }
}

async function downloadPDF(file) {
    const url = await getSignedFileUrl(file, "access");
    if (!url) return;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = file;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        showToast("⬇️ Download started");
    } catch {
        showToast("⚠️ Download failed");
    }
}

async function shareFile(file) {
    const url = await getSignedFileUrl(file, "share");
    if (!url) return;

    try {
        await navigator.clipboard.writeText(url);
        showToast("📋 Link copied (valid for 1 hour)");
    } catch {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand && document.execCommand("copy");
        textarea.remove();
        if (copied) {
            showToast("📋 Link copied (valid for 1 hour)");
        } else {
            showToast("⚠️ Copy failed — share manually");
        }
    }
}

/* ===================== Toast & Interaction Guards ===================== */
let toastTimer = null;

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    if (toastTimer) {
        clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
        toastTimer = null;
    }, 2500);
}

document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("dragstart", e => e.preventDefault());
document.addEventListener("selectstart", e => {
    if (e.target && e.target.closest && e.target.closest("input, textarea")) {
        return;
    }
    e.preventDefault();
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        closeAuthModal();
        closeManageModal();
        document.getElementById("profileMenu").classList.add("hidden-form");
        return;
    }
    const key = e.key ? e.key.toLowerCase() : "";
    if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (key === "i" || key === "j")) ||
        (e.ctrlKey && key === "u")
    ) {
        e.preventDefault();
    }
});

/* ===================== Card Accordion & Raise State ===================== */
let clickRaisedCard = null;

function raiseCard(card) {
    document.querySelectorAll(".note-card.raised").forEach(c => {
        if (c !== card) {
            c.classList.remove("raised");
        }
    });
    card.classList.add("raised");
}

document.addEventListener("click", (event) => {
    if (!event.target.closest(".note-card")) {
        document.querySelectorAll(".note-card.raised").forEach(c => c.classList.remove("raised"));
        clickRaisedCard = null;
    }
});

function setCardOpen(card, open) {
    const actions = card.querySelector(".actions");
    if (!actions) {
        card.classList.toggle("active", open);
        return;
    }

    const startHeight = actions.getBoundingClientRect().height;
    if (actions._anim) {
        actions._anim.cancel();
        actions._anim = null;
    }

    actions.classList.remove("overflow-visible");
    card.classList.toggle("active", open);

    if (typeof actions.animate !== "function") {
        if (open) actions.classList.add("overflow-visible");
        return;
    }

    const endHeight = actions.getBoundingClientRect().height;
    if (Math.abs(endHeight - startHeight) < 0.5) {
        if (open) actions.classList.add("overflow-visible");
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    root._accRunning = (root._accRunning || 0) + 1;
    root.classList.add("acc-anim");

    const anim = actions.animate(
        [
            { height: startHeight + "px" },
            { height: endHeight + "px" }
        ],
        {
            duration: reduceMotion ? 0 : 280,
            easing: "cubic-bezier(.25, .8, .25, 1)"
        }
    );
    actions._anim = anim;

    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        root._accRunning = Math.max(0, root._accRunning - 1);
        if (root._accRunning === 0) {
            root.classList.remove("acc-anim");
        }
    };

    anim.oncancel = release;
    anim.onfinish = () => {
        release();
        if (actions._anim !== anim) return;
        actions._anim = null;
        if (card.classList.contains("active")) {
            actions.classList.add("overflow-visible");
        }
    };
}

function toggleCard(card) {
    const willOpen = !card.classList.contains("active");
    document.querySelectorAll(".note-card.active").forEach(c => {
        if (c !== card) {
            setCardOpen(c, false);
        }
    });
    setCardOpen(card, willOpen);
}

/* ===================== Back/Forward Cache Guard ===================== */
window.addEventListener("pageshow", (event) => {
    if (!event.persisted || currentSession) {
        return;
    }
    const home = document.getElementById("homeScreen");
    const notes = document.getElementById("notesSection");
    home.style.display = "";
    home.classList.remove("hide-home");
    notes.classList.remove("notes-visible", "leaving");
    notes.classList.add("hidden");
    showYearSelect();
    document.getElementById("splash").classList.add("hide");
});

/* ===================== Event Bindings (replaces inline HTML handlers) ===================== */
const $id = (id) => document.getElementById(id);

$id("backToYearsBtn").addEventListener("click", showYearSelect);
$id("profileBtn").addEventListener("click", toggleProfileMenu);
$id("logoutBtn").addEventListener("click", handleLogout);
$id("enterBtn").addEventListener("click", handleEnterClick);
$id("year1Card").addEventListener("click", () => showYearView("year1View"));
$id("year2Card").addEventListener("click", () => showYearView("year2View"));

$id("authModalOverlay").addEventListener("click", closeAuthModalOnOverlay);
$id("authModalOverlay").querySelector(".modal-close").addEventListener("click", closeAuthModal);
$id("loginTabBtn").addEventListener("click", () => switchAuthTab("login"));
$id("signupTabBtn").addEventListener("click", () => switchAuthTab("signup"));

$id("toggleLoginPassword").addEventListener("click", function () {
    togglePassword("loginPassword", this);
});
$id("toggleSignupPassword").addEventListener("click", function () {
    togglePassword("signupPassword", this);
});

$id("loginForm").addEventListener("submit", handleLogin);
$id("signupForm").addEventListener("submit", handleSignup);

$id("manageModal1Overlay").addEventListener("click", closeManageModalOnOverlay);
$id("manageModal2Overlay").addEventListener("click", closeManageModalOnOverlay);
$id("manageModal1Overlay").querySelector(".modal-close").addEventListener("click", closeManageModal);
$id("manageModal2Overlay").querySelector(".modal-close").addEventListener("click", closeManageModal);
$id("addNoteForm").addEventListener("submit", handleAddNote);

document.querySelectorAll(".modal-overlay .auth-modal").forEach(el => {
    el.addEventListener("click", (e) => e.stopPropagation());
});
