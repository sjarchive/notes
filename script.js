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

    loginForm.reset();
    signupForm.reset();

    document.querySelectorAll(".password-wrap input").forEach(input => {
        input.type = "password";
    });

    document.querySelectorAll(".toggle-password").forEach(btn => {
        btn.innerHTML = EYE_ICON;
        btn.setAttribute("aria-label", "Show password");
    });

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

function handleEnterClick() {

    if (currentSession) {
        enterApp();
    } else {
        openAuthModal();
    }

}

function openAuthModal() {

    document.getElementById("authModalOverlay").classList.remove("hidden-form");
    switchAuthTab("login");

}

function closeAuthModal() {
    document.getElementById("authModalOverlay").classList.add("hidden-form");
}

function closeAuthModalOnOverlay(event) {
    if (event.target.id === "authModalOverlay") {
        closeAuthModal();
    }
}

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

let authInitialized = false;
let suppressAuthTransition = false;
let currentSession = null;

function updateManageNotesButton() {

    const button = document.getElementById("manageNotesBtn");
    const notes = document.getElementById("notesSection");
    const user = currentSession ? currentSession.user : null;
    const shouldShow = user && user.id === ADMIN_USER_ID && !notes.classList.contains("hidden");

    button.classList.toggle("hidden-form", !shouldShow);

}

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
            user.email.split("@")[0];

        profileUsername.textContent = username;
        profileContainer.classList.remove("hidden");

        updateManageNotesButton();

        closeAuthModal();

        if (authInitialized) {

            /* Just logged in this session — animate the transition into notes */
            enterApp();

        }

        /* Existing session found on page load — stay on the landing screen (with profile icon shown), don't auto-skip to notes */

    } else {

        profileContainer.classList.add("hidden");
        profileMenu.classList.add("hidden-form");
        document.getElementById("manageNotesBtn").classList.add("hidden-form");
        closeManageModal();

        if (authInitialized && !notes.classList.contains("hidden")) {

            /* Just logged out this session — animate notes fading out, then reveal the landing screen */
            leaveApp();

        } else {

            /* Initial load with no session — show the landing screen immediately, no animation */
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
        updateManageNotesButton();
    }, 400);

}

/* Leave App (Logout transition) */

function leaveApp() {

    const home = document.getElementById("homeScreen");
    const notes = document.getElementById("notesSection");

    notes.classList.add("leaving");
    updateManageNotesButton();

    setTimeout(() => {

        notes.classList.remove("notes-visible");
        notes.classList.remove("leaving");
        notes.classList.add("hidden");

        home.style.display = "";
        home.classList.remove("hide-home");

    }, 200);

}

document.addEventListener("DOMContentLoaded", () => {

/* Notes List (subject count is set once the cards finish loading) */

loadNotes();

/* Dark Mode */

const toggle = document.getElementById("themeToggle");

if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
    document.documentElement.style.background = "#121212";
    toggle.textContent = "☀️ Light Mode";
}

toggle.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    const dark =
        document.body.classList.contains("dark");

    document.documentElement.style.background = dark ? "#121212" : "";

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

/* ===================== Notes List (data-driven) ===================== */

/*
  Notes are no longer hardcoded in index.html. They live in a "notes" table
  in Supabase (see notes-setup.sql). This loads that table and builds the
  cards, so admins can add/remove a subject without touching any code.
*/

let notesCache = [];

async function loadNotes() {

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

function renderNotesGrid() {

    const grid = document.getElementById("notesGrid");

    grid.innerHTML = "";

    notesCache.forEach(note => {

        const card = document.createElement("div");
        card.className = "note-card";

        const h2 = document.createElement("h2");
        h2.innerHTML = `<span class="arrow">▼</span>`;
        h2.append(note.title);
        h2.addEventListener("click", () => toggleCard(card));

        const actions = document.createElement("div");
        actions.className = "actions";

        const previewBtn = document.createElement("button");
        previewBtn.className = "preview-btn";
        previewBtn.setAttribute("aria-label", `View ${note.title} PDF`);
        previewBtn.textContent = "👁️ View";
        previewBtn.addEventListener("click", () => previewPDF(note.filename));

        const downloadBtn = document.createElement("button");
        downloadBtn.className = "download-btn";
        downloadBtn.setAttribute("aria-label", `Download ${note.title} PDF`);
        downloadBtn.textContent = "⬇️ Download";
        downloadBtn.addEventListener("click", () => downloadPDF(note.filename));

        const shareBtn = document.createElement("button");
        shareBtn.className = "share-btn";
        shareBtn.setAttribute("aria-label", `Share ${note.title} PDF`);
        shareBtn.textContent = "🔗 Share";
        shareBtn.addEventListener("click", () => shareFile(note.filename));

        actions.appendChild(previewBtn);
        actions.appendChild(downloadBtn);
        actions.appendChild(shareBtn);

        card.appendChild(h2);
        card.appendChild(actions);

        grid.appendChild(card);

    });

    document.getElementById("subjectCount").textContent =
        `Total Subjects: ${notesCache.length}`;

}

/* ===================== Manage Notes (admin only) ===================== */

function openManageModal() {
    document.getElementById("manageModalOverlay").classList.remove("hidden-form");
    document.getElementById("manageStatus").textContent = "";
    renderManageList();
}

function closeManageModal() {
    document.getElementById("manageModalOverlay").classList.add("hidden-form");
}

function closeManageModalOnOverlay(event) {
    if (event.target.id === "manageModalOverlay") {
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

    const titleInput = document.getElementById("newNoteTitle");
    const fileInput = document.getElementById("newNoteFile");

    const title = titleInput.value.trim();
    const file = fileInput.files[0];

    if (!title) {
        showManageStatus("Please enter a title.");
        return false;
    }

    if (!file || file.type !== "application/pdf") {
        showManageStatus("Please choose a PDF file.");
        return false;
    }

    showManageStatus("Uploading…", false);

    // Keep the storage/download filename exactly as the user selected it.
    const filename = file.name;

    const { error: uploadError } = await supabaseClient
        .storage
        .from(NOTES_BUCKET)
        .upload(filename, file, { contentType: "application/pdf" });

    if (uploadError) {
        showManageStatus("Upload failed: " + uploadError.message);
        return false;
    }

    const nextPosition = notesCache.length
        ? Math.max(...notesCache.map(n => n.position ?? 0)) + 1
        : 0;

    const { error: insertError } = await supabaseClient
        .from("notes")
        .insert({ title, filename, position: nextPosition });

    if (insertError) {
        /* Roll back the uploaded file so it doesn't sit there orphaned */
        await supabaseClient.storage.from(NOTES_BUCKET).remove([filename]);
        showManageStatus("Couldn't save note: " + insertError.message);
        return false;
    }

    titleInput.value = "";
    fileInput.value = "";

    showManageStatus("✓ Note added.", false);

    await loadNotes();

    return false;

}

async function handleDeleteNote(id, filename, title) {

    if (!confirm(`Delete "${title}" and its PDF? This can't be undone.`)) {
        return;
    }

    const { error: storageError } = await supabaseClient
        .storage
        .from(NOTES_BUCKET)
        .remove([filename]);

    if (storageError) {
        showManageStatus("Couldn't delete file: " + storageError.message);
        return;
    }

    const { error: dbError } = await supabaseClient
        .from("notes")
        .delete()
        .eq("id", id);

    if (dbError) {
        showManageStatus("Couldn't delete note record: " + dbError.message);
        return;
    }

    showManageStatus("✓ Note deleted.", false);

    await loadNotes();

}

async function moveNote(noteId, direction) {

    const currentIndex = notesCache.findIndex(note => note.id === noteId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= notesCache.length) {
        return;
    }

    const current = notesCache[currentIndex];
    const target = notesCache[targetIndex];
    const currentPosition = current.position ?? currentIndex;
    const targetPosition = target.position ?? targetIndex;

    showManageStatus("Saving order…", false);

    const results = await Promise.all([
        supabaseClient.from("notes").update({ position: targetPosition }).eq("id", current.id),
        supabaseClient.from("notes").update({ position: currentPosition }).eq("id", target.id)
    ]);

    const error = results.find(result => result.error)?.error;
    if (error) {
        showManageStatus("Couldn't save order: " + error.message);
        return;
    }

    showManageStatus("✓ Note order saved.", false);
    await loadNotes();

}

function renderManageList() {

    const list = document.getElementById("manageNotesList");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    notesCache.forEach(note => {

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
        moveUp.disabled = notesCache.indexOf(note) === 0;
        moveUp.addEventListener("click", () => moveNote(note.id, -1));

        const moveDown = document.createElement("button");
        moveDown.type = "button";
        moveDown.className = "manage-move-btn";
        moveDown.textContent = "↓";
        moveDown.setAttribute("aria-label", `Move ${note.title} down`);
        moveDown.disabled = notesCache.indexOf(note) === notesCache.length - 1;
        moveDown.addEventListener("click", () => moveNote(note.id, 1));

        const del = document.createElement("button");
        del.type = "button";
        del.className = "manage-delete-btn";
        del.textContent = "🗑️";
        del.setAttribute("aria-label", `Delete ${note.title}`);
        del.addEventListener("click", () => handleDeleteNote(note.id, note.filename, note.title));

        row.appendChild(label);
        controls.appendChild(moveUp);
        controls.appendChild(moveDown);
        controls.appendChild(del);
        row.appendChild(controls);

        list.appendChild(row);

    });

}

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
