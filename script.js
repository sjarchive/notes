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

function previewPDF(file) {

    window.open(file, "_blank");

}

/* Download PDF */

function downloadPDF(file) {

    const a = document.createElement("a");

    a.href = file;
    a.download = "";

    document.body.appendChild(a);

    a.click();

    a.remove();

    showToast("✓ Download started");

}

/* Share PDF Link */

async function shareFile(file) {

    const url =
        window.location.origin +
        window.location.pathname.replace(
            "index.html",
            ""
        ) +
        file;

    try {

        await navigator.clipboard.writeText(url);

        showToast("🔗 Link copied");

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
