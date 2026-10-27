/* Apply saved Dark Mode synchronously before first paint to prevent FOUC */
    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark");
        document.documentElement.style.background = "#121212";
    }
