document.addEventListener("DOMContentLoaded", () => {

    const cards = document.querySelectorAll(".note-card");

    document.getElementById("subjectCount").textContent =
        `Total Subjects: ${cards.length}`;

    const toggle = document.getElementById("themeToggle");

    if(localStorage.getItem("darkMode") === "true"){
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

    document
        .querySelectorAll(".download-btn")
        .forEach(btn => {

            btn.addEventListener("click", () => {
                showToast("✓ Download started");
            });

        });

});

/* Share Link */

function shareFile(file){

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

/* Toast */

function showToast(message){

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);

}

/* Scroll Button */

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
        top:0,
        behavior:"smooth"
    });

});

/* Disable Right Click */

document.addEventListener(
    "contextmenu",
    function(e){
        e.preventDefault();
    }
);

/* Disable Dragging */

document.addEventListener(
    "dragstart",
    function(e){
        e.preventDefault();
    }
);

/* Disable Selection */

document.addEventListener(
    "selectstart",
    function(e){
        e.preventDefault();
    }
);

/* Optional Shortcuts */

document.addEventListener(
    "keydown",
    function(e){

        if(
            e.key === "F12" ||

            (e.ctrlKey &&
             e.shiftKey &&
             e.key === "I") ||

            (e.ctrlKey &&
             e.shiftKey &&
             e.key === "J") ||

            (e.ctrlKey &&
             e.key === "U")
        ){
            e.preventDefault();
        }

    }
);
