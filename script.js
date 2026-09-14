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

    // switchAuthTab() resets both forms (clearing any value), so the
    // username must be filled in AFTER it runs, not before.
    document.getElementById("loginUsername").value = username;
    document.getElementById("loginPassword").value = "";
    document.getElementById("loginPassword").focus();

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

/* ===================== Background scroll lock (modals) =====================
   The modal overlay is position:fixed, but that alone doesn't stop the page
   underneath from scrolling on touch devices — a finger dragging on the
   overlay/modal can still drag the background page with it, which is what
   caused the janky scrolling behind the login/signup dialog on mobile. This
   pins the body in place for as long as any modal is open and restores the
   exact scroll position afterward. A counter is used (instead of a simple
   boolean) so two modals never stomp on each other's saved scroll position
   if one were ever opened while another is still open. */

let scrollLockY = 0;
let scrollLockCount = 0;

function lockBodyScroll() {

    if (scrollLockCount === 0) {
        scrollLockY = window.scrollY;
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollLockY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
    }

    scrollLockCount++;

}

function unlockBodyScroll() {

    scrollLockCount = Math.max(0, scrollLockCount - 1);

    if (scrollLockCount === 0) {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollLockY);
    }

}

function openAuthModal() {

    document.getElementById("authModalOverlay").classList.remove("hidden-form");
    switchAuthTab("login");
    repositionAuthModal();
    lockBodyScroll();

}

function closeAuthModal() {
    const overlay = document.getElementById("authModalOverlay");
    if (overlay.classList.contains("hidden-form")) {
        return;
    }
    overlay.classList.add("hidden-form");
    // Clear the inline positioning set by repositionAuthModal() so the
    // overlay falls back to its default CSS (inset:0) next time it opens.
    overlay.style.height = "";
    overlay.style.top = "";
    unlockBodyScroll();
}

function closeAuthModalOnOverlay(event) {
    if (event.target.id === "authModalOverlay") {
        closeAuthModal();
    }
}

/* ===================== Keyboard-aware modal positioning =====================
   interactive-widget=resizes-visual (set in index.html) keeps the layout
   viewport fixed when the on-screen keyboard opens, which is what stops the
   whole page (background blobs, backdrop blur, etc.) from reflowing and
   jittering. The trade-off is that position:fixed elements no longer get
   pushed up automatically, so the modal has to be repositioned manually.
   Only the modal overlay itself is resized here — nothing else on the page
   is touched, so this doesn't reintroduce the original jitter. */

function repositionAuthModal() {

    const overlay = document.getElementById("authModalOverlay");

    if (!overlay || overlay.classList.contains("hidden-form") || !window.visualViewport) {
        return;
    }

    const vv = window.visualViewport;
    overlay.style.height = vv.height + "px";
    overlay.style.top = vv.offsetTop + "px";

}

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", repositionAuthModal);
    window.visualViewport.addEventListener("scroll", repositionAuthModal);
}

/* Fallback for browsers (seen on some Firefox builds) where the keyboard
   doesn't reliably fire a visualViewport "resize" event: re-run the same
   positioning logic directly off focus/blur on the auth fields instead,
   after a short delay to let the keyboard finish animating in/out. Also
   scrolls the focused field into view, which works even on browsers with
   no visualViewport support at all. */

document.querySelectorAll("#authModalOverlay input").forEach(input => {

    input.addEventListener("focus", () => {
        setTimeout(() => {
            repositionAuthModal();
            input.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
    });

    input.addEventListener("blur", () => {
        setTimeout(repositionAuthModal, 300);
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

/* Give a button instant visual feedback on tap, and run its action.
   Keeps the button from feeling unresponsive while a network call is
   still in flight, and stops double-taps from firing it twice. */
function withTapFeedback(button, originalLabel, action) {

    return async () => {

        if (button.disabled) {
            return;
        }

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

    grid.innerHTML = "";

    notesCache.forEach(note => {

        const card = document.createElement("div");
        card.className = "note-card";

        const h2 = document.createElement("h2");
        h2.innerHTML = `<span class="arrow">▼</span>`;
        h2.append(note.title);

        card.addEventListener("click", (event) => {
            raiseCard(card);
            // Clicking a preview/download/share button should just run that
            // button's own action, not also expand/collapse the card.
            if (event.target.closest(".actions")) {
                return;
            }
            toggleCard(card);
        });
        // Note: raising used to also fire on touchstart, but that made the
        // "lift" and "expand" animations run out of sync on mobile (lift
        // starts on touch, expand starts later on click) which read as
        // jitter. Letting click drive both keeps them in the same frame.
        // The whole card (not just the title) is clickable to expand or
        // collapse it, since toggleCard() is now driven from here too.

        // Hovering anywhere on the card raises it — same raiseCard() the
        // click uses, so it also lowers whichever other card was raised
        // (even if that one is still expanded/active) and works over the
        // buttons too, since mouseenter fires on entering the card's box
        // from outside regardless of which descendant is under the pointer.
        // This also bypasses the mobile media query's
        // .note-card:hover:not(.raised) rule (added to stop cards getting
        // stuck raised after a tap), since it only excludes hover styling
        // when .raised is absent — here we add .raised directly.
        card.addEventListener("mouseenter", () => raiseCard(card));

        const actions = document.createElement("div");
        actions.className = "actions";

        const actionsInner = document.createElement("div");
        actionsInner.className = "actions-inner";


        const previewBtn = document.createElement("button");
        previewBtn.className = "preview-btn";
        previewBtn.setAttribute("aria-label", `View ${note.title} PDF`);
        previewBtn.textContent = "👁️ View";
        previewBtn.addEventListener("click", withTapFeedback(previewBtn, "👁️ View", () => previewPDF(note.filename)));

        const downloadBtn = document.createElement("button");
        downloadBtn.className = "download-btn";
        downloadBtn.setAttribute("aria-label", `Download ${note.title} PDF`);
        downloadBtn.textContent = "⬇️ Download";
        downloadBtn.addEventListener("click", withTapFeedback(downloadBtn, "⬇️ Download", () => downloadPDF(note.filename)));

        const shareBtn = document.createElement("button");
        shareBtn.className = "share-btn";
        shareBtn.setAttribute("aria-label", `Share ${note.title} PDF`);
        shareBtn.textContent = "🔗 Share";
        shareBtn.addEventListener("click", withTapFeedback(shareBtn, "🔗 Share", () => shareFile(note.filename)));

        actionsInner.appendChild(previewBtn);
        actionsInner.appendChild(downloadBtn);
        actionsInner.appendChild(shareBtn);
        actions.appendChild(actionsInner);

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
    lockBodyScroll();
}

function closeManageModal() {
    const overlay = document.getElementById("manageModalOverlay");
    if (overlay.classList.contains("hidden-form")) {
        return;
    }
    overlay.classList.add("hidden-form");
    unlockBodyScroll();
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

/* File access via our own Worker (see worker.js) — this way a shared or
   downloaded link only ever shows this site's own domain, never the
   Supabase project URL or its storage token. */

async function getSignedFileUrl(file, kind) {

    const accessToken = currentSession?.access_token;

    if (!accessToken) {
        showToast("⚠️ Please log in again");
        return null;
    }

    const res = await fetch(`/sign?file=${encodeURIComponent(file)}&kind=${kind}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!res.ok) {
        showToast("⚠️ Couldn't load file");
        return null;
    }

    const { url } = await res.json();
    return url;

}

async function previewPDF(file) {

    // Open the tab synchronously, in direct response to the tap — if we wait
    // for the fetch first, mobile Safari no longer counts it as a trusted
    // user gesture and will delay or block the popup.
    const newTab = window.open("", "_blank");

    const url = await getSignedFileUrl(file, "access");

    if (url && newTab) {
        newTab.location.href = url;
    } else if (newTab) {
        newTab.close();
    }

}

/* Download PDF */

async function downloadPDF(file) {

    const url = await getSignedFileUrl(file, "access");

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

    const url = await getSignedFileUrl(file, "share");

    if (!url) {
        return;
    }

    try {

        await navigator.clipboard.writeText(url);

        showToast("🔗 Link copied (valid for 1 hour)");

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

/* Raised card on click (stays raised until you click elsewhere) */

function raiseCard(card) {

    document.querySelectorAll(".note-card").forEach(c => {

        if (c !== card) {
            c.classList.remove("raised");
        }

    });

    card.classList.add("raised");

}

document.addEventListener("click", (event) => {

    if (!event.target.closest(".note-card")) {

        document.querySelectorAll(".note-card.raised")
            .forEach(c => c.classList.remove("raised"));

    }

});

/* Collapsible Cards */

function toggleCard(card) {

    const allCards =
        document.querySelectorAll(".note-card");

    allCards.forEach(c => {

        if (c !== card) {

            c.classList.remove("active");

            const otherActionsInner = c.querySelector(".actions-inner");
            if (otherActionsInner) {
                otherActionsInner.classList.remove("overflow-visible");
            }

            const arrow = c.querySelector(".arrow");

            if (arrow) {
                arrow.textContent = "▼";
            }

        }

    });

    card.classList.toggle("active");

    const isActive = card.classList.contains("active");

    const actions = card.querySelector(".actions");
    const actionsInner = card.querySelector(".actions-inner");

    // Keep overflow clipped while the panel grows/shrinks so the height
    // transition stays smooth, then reveal it once fully open so button
    // shadows aren't cut off by the container's edge.
    actionsInner.classList.remove("overflow-visible");

    if (isActive) {

        let revealed = false;

        const reveal = () => {
            if (!revealed && card.classList.contains("active")) {
                revealed = true;
                actionsInner.classList.add("overflow-visible");
            }
        };

        actions.addEventListener("transitionend", function onOpenEnd(e) {

            if (e.propertyName !== "grid-template-rows") {
                return;
            }

            reveal();
            actions.removeEventListener("transitionend", onOpenEnd);

        });

        // Fallback in case transitionend doesn't fire (e.g. reduced-motion).
        setTimeout(reveal, 320);

    }

    const arrow = card.querySelector(".arrow");

    arrow.textContent =
        isActive
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

        }, 1600);

    }
);

/* ===================== Back/Forward Cache Guard =====================

   When the browser restores this page from bfcache (e.g. tapping the
   back button after visiting a link, or the OS reviving a suspended
   tab), it re-shows the exact DOM as it was left — including "notes
   page visible" — WITHOUT re-running our normal load logic. That is
   what caused the site to sometimes open straight onto the notes page
   instead of the enter screen.

   Fix: whenever a bfcache restore happens, snap the DOM back to the
   landing screen. currentSession/authInitialized already reflect the
   real login state in memory, so this only resets what's on screen —
   it doesn't log anyone out. */

window.addEventListener("pageshow", (event) => {

    if (!event.persisted) {
        return;
    }

    const home = document.getElementById("homeScreen");
    const notes = document.getElementById("notesSection");

    home.style.display = "";
    home.classList.remove("hide-home");

    notes.classList.remove("notes-visible");
    notes.classList.remove("leaving");
    notes.classList.add("hidden");

    document.getElementById("splash").classList.add("hide");

});
