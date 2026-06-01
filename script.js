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

/* PDF Modal Close Button */

const closeBtn =
    document.getElementById("closePdf");

closeBtn.addEventListener(
    "click",
    () => {

        document
            .getElementById("pdfModal")
            .style.display = "none";

        document
            .getElementById("pdfViewer")
            .src = "";

    }
);

/* Close PDF When Clicking Outside */

const pdfModal =
    document.getElementById("pdfModal");

pdfModal.addEventListener(
    "click",
    (e) => {

        if(e.target === pdfModal){

            pdfModal.style.display = "none";

            document
                .getElementById("pdfViewer")
                .src = "";

        }

    }
);

});

/* Preview PDF */

function previewPDF(file){

    document
        .getElementById("pdfViewer")
        .src = file;

    document
        .getElementById("pdfModal")
        .style.display = "flex";

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

function shareFile(file) {

const url =
    window.location.origin +
    window.location.pathname.replace(
        "index.html",
        ""
    ) +
    file;

navigator.clipboard.writeText(url);

showToast("🔗 Link copied");

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

/* Scroll To Top Button */

const topBtn =
document.getElementById("topBtn");

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
