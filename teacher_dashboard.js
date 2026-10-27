// Student Space - Teacher Dashboard
// This file controls the dashboard buttons and popups.

// Find the main page elements once so we can use them below.
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const sidebarScrim = document.getElementById("sidebarScrim");
const toast = document.getElementById("toast");
const answerModal = document.getElementById("answerModal");
const modalQuestion = document.getElementById("modalQuestion");
const answerText = document.getElementById("answerText");
const forgotModal = document.getElementById("forgotModal");

let toastTimer;

// Each navigation name is connected to its HTML section and heading.
const views = {
    dashboard: { id: "dashboardView", title: "Dashboard" },
    "question-wall": { id: "questionWallView", title: "Question Wall" },
    "tagged-questions": { id: "taggedQuestionsView", title: "Tagged Questions" },
    "answered-questions": { id: "answeredQuestionsView", title: "Answered Questions" },
    "my-subjects": { id: "mySubjectsView", title: "My Subjects" },
    notifications: { id: "notificationsView", title: "Notifications" },
    settings: { id: "settingsView", title: "Settings" }
};

// Show a message at the bottom of the page.
function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        toast.classList.remove("show");
    }, 2800);
}

// Hide the mobile navigation menu.
function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarScrim.classList.remove("show");
    menuToggle.setAttribute("aria-expanded", "false");
}

// Show one dashboard section and hide the others.
function openView(viewName) {
    if (!views[viewName]) return;

    document.querySelectorAll(".view").forEach(function (section) {
        section.classList.remove("active");
    });

    document.getElementById(views[viewName].id).classList.add("active");

    document.querySelectorAll(".nav-link[data-view]").forEach(function (link) {
        link.classList.toggle("active", link.dataset.view === viewName);
    });

    document.getElementById("currentSection").textContent = views[viewName].title;
    closeSidebar();
    closeProfileMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Make navigation links open their matching sections.
document.querySelectorAll("[data-view]").forEach(function (element) {
    element.addEventListener("click", function (event) {
        const viewName = element.dataset.view;

        if (views[viewName]) {
            event.preventDefault();
            openView(viewName);
        }
    });
});

// Open or close the mobile sidebar.
menuToggle.addEventListener("click", function () {
    const menuIsOpen = !sidebar.classList.contains("open");

    sidebar.classList.toggle("open", menuIsOpen);
    sidebarScrim.classList.toggle("show", menuIsOpen);
    menuToggle.setAttribute("aria-expanded", String(menuIsOpen));
});
sidebarScrim.addEventListener("click", closeSidebar);

// Open the answer popup for the question the teacher selected.
document.querySelectorAll(".answer-button[data-question]").forEach(function (button) {
    button.addEventListener("click", function () {
        modalQuestion.textContent = button.dataset.question;
        answerText.value = "";
        answerModal.classList.add("show");
        answerText.focus();
    });
});

function closeAnswerModal() {
    answerModal.classList.remove("show");
}
document.getElementById("closeModal").addEventListener("click", closeAnswerModal);
document.getElementById("cancelAnswer").addEventListener("click", closeAnswerModal);
answerModal.addEventListener("click", function (event) {
    if (event.target === answerModal) closeAnswerModal();
});

// Close popups and menus when the Escape key is pressed.
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeAnswerModal();
        closeForgotModal();
        closeSidebar();
        closeProfileMenu();
    }
});

// Check the answer field before showing the demo confirmation.
document.getElementById("submitAnswer").addEventListener("click", function () {
    if (answerText.value.trim() === "") {
        showToast("Write an answer before submitting.");
        answerText.focus();
        return;
    }

    closeAnswerModal();
    showToast("Demo only: connect answer submission to Flask + MySQL to save this answer.");
});

// Filter Question Wall cards by status.
document.querySelectorAll(".filter").forEach(function (button) {
    button.addEventListener("click", function () {
        document.querySelectorAll(".filter").forEach(function (filterButton) {
            filterButton.classList.remove("active");
        });
        button.classList.add("active");

        const selectedStatus = button.dataset.filter;
        document.querySelectorAll("#questionWallView .wall-card").forEach(function (card) {
            card.hidden = selectedStatus !== "all" && card.dataset.status !== selectedStatus;
        });
    });
});

// Search the content in the currently open section.
document.getElementById("searchInput").addEventListener("input", function (event) {
    const searchText = event.target.value.trim().toLowerCase();
    const activeSection = document.querySelector(".view.active");
    if (!activeSection) return;

    activeSection.querySelectorAll(".question-card, .subject-card, .notification-item").forEach(function (card) {
        card.hidden = searchText !== "" && !card.textContent.toLowerCase().includes(searchText);
    });
});

// Profile dropdown.
const profileButton = document.getElementById("profileButton");
const profileMenu = document.getElementById("profileMenu");

function closeProfileMenu() {
    if (!profileButton || !profileMenu) return;
    profileMenu.hidden = true;
    profileButton.setAttribute("aria-expanded", "false");
}

if (profileButton && profileMenu) {
    profileButton.addEventListener("click", function (event) {
        event.stopPropagation();
        profileMenu.hidden = !profileMenu.hidden;
        profileButton.setAttribute("aria-expanded", String(!profileMenu.hidden));
    });

    document.addEventListener("click", function (event) {
        if (!event.target.closest(".profile-wrap")) closeProfileMenu();
    });

    profileMenu.querySelectorAll("[data-view]").forEach(function (button) {
        button.addEventListener("click", function () {
            closeProfileMenu();

            if (button.dataset.focus === "password") {
                setTimeout(function () {
                    const passwordSettings = document.getElementById("passwordSettings");
                    if (passwordSettings) {
                        passwordSettings.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                }, 80);
            }
        });
    });
}

// Open account settings from the profile menu.
const profileHelp = document.getElementById("profileHelp");
if (profileHelp) {
    profileHelp.addEventListener("click", function () {
        closeProfileMenu();
        openView("settings");
        showToast("Your teacher profile details are available in Account Settings.");
    });
}

// The real sign-out action must be connected to a Flask route.
const profileSignOut = document.getElementById("profileSignOut");
if (profileSignOut) {
    profileSignOut.addEventListener("click", function () {
        closeProfileMenu();
        showToast("Connect this action to your Flask logout route to sign out securely.");
    });
}

// Forgot-password popup. Sending a real email needs a Flask backend.
function closeForgotModal() {
    if (forgotModal) forgotModal.classList.remove("show");
}

const forgotPasswordButton = document.getElementById("forgotPasswordButton");
if (forgotPasswordButton) {
    forgotPasswordButton.addEventListener("click", function () {
        const teacherEmail = document.getElementById("teacherEmail");
        const recoveryEmail = document.getElementById("recoveryEmail");
        recoveryEmail.value = teacherEmail ? teacherEmail.value : "";
        forgotModal.classList.add("show");
        recoveryEmail.focus();
    });
}

document.getElementById("closeForgotModal").addEventListener("click", closeForgotModal);
document.getElementById("cancelForgot").addEventListener("click", closeForgotModal);
forgotModal.addEventListener("click", function (event) {
    if (event.target === forgotModal) closeForgotModal();
});

// Check the recovery email format before showing the demo message.
document.getElementById("sendRecovery").addEventListener("click", function () {
    const recoveryEmail = document.getElementById("recoveryEmail");
    const email = recoveryEmail.value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        showToast("Enter a valid registered email address.");
        recoveryEmail.focus();
        return;
    }

    closeForgotModal();
    showToast("UI demo only: connect this to a secure Flask recovery endpoint to send an OTP or reset link.");
});

// Show or hide password characters.
document.querySelectorAll(".toggle-password").forEach(function (button) {
    button.addEventListener("click", function () {
        const input = document.getElementById(button.dataset.target);
        const showPassword = input.type === "password";
        input.type = showPassword ? "text" : "password";
        button.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
    });
});

// Check password fields before showing the demo confirmation.
document.getElementById("changePasswordButton").addEventListener("click", function () {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast("Fill in all three password fields.");
        return;
    }
    if (newPassword.length < 8) {
        showToast("Use at least 8 characters for the new password.");
        return;
    }
    if (newPassword !== confirmPassword) {
        showToast("The new passwords do not match.");
        document.getElementById("confirmPassword").focus();
        return;
    }

    showToast("UI demo only: connect password change to Flask with secure password verification.");
});

// Saving real settings also requires a Flask route.
document.getElementById("saveSettings").addEventListener("click", function () {
    showToast("Demo only: connect settings to Flask to save changes.");
});
