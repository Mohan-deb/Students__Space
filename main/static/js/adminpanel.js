// Students Space - Admin Dashboard
// Plain JavaScript: switch between Dashboard / Add Teacher, count-up numbers,
// form checks and show/hide password. Everything lives on one page.

document.addEventListener("DOMContentLoaded", function () {

    // ---------- 1. Switch views from the sidebar ----------
    var links = document.querySelectorAll(".nav-link[data-view]");
    var views = document.querySelectorAll(".view");
    var pageTitle = document.getElementById("pageTitle");

    function showView(name, focusForm) {
        if (!document.getElementById("view-" + name)) name = "dashboard";

        views.forEach(function (view) {
            var isThis = view.id === "view-" + name;
            view.hidden = !isThis;
            if (isThis) pageTitle.textContent = view.dataset.title;
        });

        links.forEach(function (link) {
            var isThis = link.dataset.view === name;
            link.classList.toggle("active", isThis);
            if (isThis) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });

        if (name === "add-teacher" && focusForm) {
            document.getElementById("teachername").focus();
        }
    }

    links.forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            var name = link.dataset.view;
            history.replaceState(null, "", "#" + name);
            showView(name, true);
        });
    });

    // Open the right view on load (e.g. /admin_dashboard#add-teacher) and on back/forward.
    function viewFromHash() {
        return window.location.hash.replace("#", "") || "dashboard";
    }
    window.addEventListener("hashchange", function () { showView(viewFromHash(), true); });
    showView(viewFromHash(), false);

    // ---------- 2. Count-up animation for the totals ----------
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.querySelectorAll(".stat-number").forEach(function (el) {
        var target = parseInt(el.dataset.count, 10);
        if (isNaN(target) || target <= 0 || reduceMotion) return;

        var duration = 700;
        var start = null;

        function step(timestamp) {
            if (start === null) start = timestamp;
            var progress = Math.min((timestamp - start) / duration, 1);
            el.textContent = Math.round(progress * target);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    });

    // ---------- 3. Show / hide password ----------
    document.querySelectorAll(".toggle-password").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var input = document.getElementById(btn.dataset.target);
            var show = input.type === "password";
            input.type = show ? "text" : "password";
            btn.textContent = show ? "Hide" : "Show";
            btn.setAttribute("aria-label", (show ? "Hide " : "Show ") +
                (btn.dataset.target === "password" ? "password" : "confirm password"));
        });
    });

    // ---------- 4. Form validation ----------
    var form = document.getElementById("teacherForm");
    if (form) setupForm(form);

    function setupForm(form) {
    var submitBtn = document.getElementById("addteacher");
    var status = document.getElementById("formStatus");

    var fields = {
        teachername: document.getElementById("teachername"),
        teacheremail: document.getElementById("teacheremail"),
        teacherbranch: document.getElementById("teacherbranch"),
        password: document.getElementById("password"),
        confirmpassword: document.getElementById("confirmpassword")
    };

    // Returns an error message, or "" when the field is fine.
    var rules = {
        teachername: function (v) {
            if (v.trim() === "") return "Enter the teacher's name.";
            if (v.trim().length < 2) return "Name must be at least 2 characters.";
            return "";
        },
        teacheremail: function (v) {
            if (v.trim() === "") return "Enter the teacher's email.";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Enter a valid email, like name@example.com.";
            return "";
        },
        teacherbranch: function (v) {
            return v === "" ? "Select a branch." : "";
        },
        password: function (v) {
            if (v === "") return "Enter a password.";
            if (v.length < 6) return "Password must be at least 6 characters.";
            return "";
        },
        confirmpassword: function (v) {
            if (v === "") return "Re-enter the password.";
            if (v !== fields.password.value) return "Passwords do not match.";
            return "";
        }
    };

    function check(id) {
        var message = rules[id](fields[id].value);
        var wrapper = fields[id].closest(".field");
        document.getElementById(id + "-error").textContent = message;
        wrapper.classList.toggle("invalid", message !== "");
        fields[id].setAttribute("aria-invalid", message !== "" ? "true" : "false");
        return message === "";
    }

    // Check a field when the user leaves it, and re-check while fixing it.
    Object.keys(fields).forEach(function (id) {
        fields[id].addEventListener("blur", function () { check(id); });
        fields[id].addEventListener("input", function () {
            if (fields[id].closest(".field").classList.contains("invalid")) check(id);
            if (id === "password" && fields.confirmpassword.value !== "") check("confirmpassword");
        });
        fields[id].addEventListener("change", function () { check(id); });
    });

    form.addEventListener("submit", function (event) {
        var allValid = true;
        var firstInvalid = null;

        Object.keys(fields).forEach(function (id) {
            if (!check(id)) {
                allValid = false;
                if (!firstInvalid) firstInvalid = fields[id];
            }
        });

        if (!allValid) {
            event.preventDefault();      // stop the post; show the errors
            status.textContent = "Fix the highlighted fields and try again.";
            firstInvalid.focus();
            return;
        }

        // Valid: let the browser post to Flask. Block double clicks.
        status.textContent = "Adding teacher...";
        submitBtn.disabled = true;
    });

    }

    // ---------- 5. Fade out success / error messages after a few seconds ----------
    document.querySelectorAll(".alert-success").forEach(function (box) {
        setTimeout(function () { box.style.display = "none"; }, 6000);
    });
});
