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
const urls = window.teacherSpaceUrls;
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
let dashboardData = { questions: [], messages: [], notifications: [], statistics: {} };
let selectedQuestionId = null;

let toastTimer;

// Each navigation name is connected to its HTML section and heading.
const views = {
    dashboard: { id: "dashboardView", title: "Dashboard" },
    "question-wall": { id: "questionWallView", title: "Question Wall" },
    "tagged-questions": { id: "taggedQuestionsView", title: "Tagged Questions" },
    "answered-questions": { id: "answeredQuestionsView", title: "Answered Questions" },
    messages: { id: "messagesView", title: "Messages" },
    "my-subjects": { id: "mySubjectsView", title: "My Subjects" },
    notifications: { id: "notificationsView", title: "Notifications" },
    settings: { id: "settingsView", title: "Settings" }
};

async function apiRequest(url, method = "GET", body = null) {
    const options = { method, credentials: "same-origin", headers: {} };
    if (body !== null) {
        options.headers["Content-Type"] = "application/json";
        options.headers["X-CSRF-Token"] = csrfToken;
        options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    let result = {};
    try { result = await response.json(); } catch (error) { }
    if (!response.ok) throw new Error(result.error || "The request could not be completed.");
    return result;
}

function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, function (character) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character];
    });
}

function displayTime(value) {
    if (!value) return "";
    const date = new Date(value.replace(" ", "T") + "Z");
    if (Number.isNaN(date.getTime())) return value;
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return minutes + " min ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
    const days = Math.floor(hours / 24);
    if (days < 7) return days + " day" + (days === 1 ? "" : "s") + " ago";
    return date.toLocaleDateString();
}

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
    if (viewName === "notifications") renderNotifications();
    if (viewName === "messages") renderMessages();
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

// Open the answer popup for a question rendered from SQLite.
document.addEventListener("click", function (event) {
    const button = event.target.closest(".answer-button[data-question-id]");
    if (!button) return;
    const question = dashboardData.questions.find(function (item) {
        return Number(item.id) === Number(button.dataset.questionId);
    });
    if (!question) return;
    selectedQuestionId = question.id;
    modalQuestion.textContent = question.title + " — " + question.description;
    answerText.value = "";
    answerModal.classList.add("show");
    answerText.focus();
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

// Save a teacher answer through the authenticated Flask route.
document.getElementById("submitAnswer").addEventListener("click", async function () {
    if (answerText.value.trim() === "") {
        showToast("Write an answer before submitting.");
        answerText.focus();
        return;
    }

    try {
        await apiRequest(
            urls.answerTemplate.replace("/0/answers", `/${selectedQuestionId}/answers`),
            "POST",
            { content: answerText.value.trim() }
        );
        closeAnswerModal();
        await loadDashboard();
        showToast("Your answer was saved.");
    } catch (error) {
        showToast(error.message);
    }
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
            if (selectedStatus === "all") card.hidden = false;
            else if (selectedStatus === "tagged") card.hidden = card.dataset.tagged !== "true";
            else card.hidden = card.dataset.status !== selectedStatus;
        });
    });
});

// Search the content in the currently open section.
document.getElementById("searchInput").addEventListener("input", function (event) {
    const searchText = event.target.value.trim().toLowerCase();
    const activeSection = document.querySelector(".view.active");
    if (!activeSection) return;

    activeSection.querySelectorAll(".question-card, .subject-card, .notification-item, .message-card").forEach(function (card) {
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

const profileSignOut = document.getElementById("profileSignOut");
if (profileSignOut) {
    profileSignOut.addEventListener("click", function () {
        closeProfileMenu();
        window.location.href = urls.logout;
    });
}

// Show the available account recovery guidance.
function closeForgotModal() {
    if (forgotModal) forgotModal.classList.remove("show");
}

const forgotPasswordButton = document.getElementById("forgotPasswordButton");
if (forgotPasswordButton) {
    forgotPasswordButton.addEventListener("click", function () {
        forgotModal.classList.add("show");
        document.getElementById("sendRecovery").focus();
    });
}

document.getElementById("closeForgotModal").addEventListener("click", closeForgotModal);
document.getElementById("cancelForgot").addEventListener("click", closeForgotModal);
forgotModal.addEventListener("click", function (event) {
    if (event.target === forgotModal) closeForgotModal();
});

document.getElementById("sendRecovery").addEventListener("click", function () {
    closeForgotModal();
    showToast("Password recovery is unavailable. Change your password in Account Settings while signed in.");
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

// Verify the current password and store the new hash through Flask.
document.getElementById("changePasswordButton").addEventListener("click", async function () {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const status = document.getElementById("passwordStatus");

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

    try {
        await apiRequest(urls.changePassword, "POST", {
            current_password: currentPassword,
            new_password: newPassword
        });
        status.textContent = "Password changed successfully.";
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
        showToast("Password changed successfully.");
    } catch (error) {
        status.textContent = error.message;
        showToast(error.message);
    }
});

document.getElementById("saveSettings").addEventListener("click", async function () {
    const status = document.getElementById("settingsStatus");
    try {
        const result = await apiRequest(urls.profile, "POST", {
            name: document.getElementById("displayName").value.trim(),
            email: document.getElementById("teacherEmail").value.trim()
        });
        renderTeacherProfile(result.profile);
        status.textContent = "Profile changes saved.";
        showToast("Profile changes saved.");
    } catch (error) {
        status.textContent = error.message;
        showToast(error.message);
    }
});

function renderTeacherProfile(profile) {
    document.querySelectorAll(".sidebar-footer strong, .profile-copy strong, .profile-menu-head strong")
        .forEach(function (element) { element.textContent = profile.teacher_name; });
    document.querySelectorAll(".teacher-mini-avatar, .profile-avatar")
        .forEach(function (element) { element.textContent = profile.teacher_name.slice(0, 1).toUpperCase(); });
    document.getElementById("displayName").value = profile.teacher_name;
    document.getElementById("teacherEmail").value = profile.mail;
}

function questionCard(question, wallCard = false, answeredByTeacher = false) {
    let statusText = "Unanswered";
    let statusClass = "status-pending";
    if (question.status === "answered") {
        statusText = "Answered";
        statusClass = "status-answered";
    } else if (question.teacher_tagged) {
        statusText = "Tagged to you";
        statusClass = "status-tagged";
    }

    const answerButton = question.status === "unanswered"
        ? `<button class="answer-button" type="button" data-question-id="${question.id}">Write an answer <span>→</span></button>`
        : "";
    const answerPreviews = (question.answer_records || []).map(function (answer) {
        return `<div class="answer-preview"><strong>${escapeHTML(answer.author_name)}</strong>
            <p>${escapeHTML(answer.content)}</p><small>${escapeHTML(displayTime(answer.created_at))}</small></div>`;
    }).join("");

    return `<article class="question-card ${wallCard ? "wall-card" : ""}"
        data-status="${question.status}" data-tagged="${question.teacher_tagged ? "true" : "false"}">
        <div class="question-meta"><span class="status ${statusClass}">${statusText}</span>
            <time>${escapeHTML(displayTime(question.created_at))}</time></div>
        <h4>${escapeHTML(question.title)}</h4>
        <p class="question-byline">${escapeHTML(question.student_name)} <span>•</span> ${escapeHTML(question.subject)}</p>
        <p class="question-description">${escapeHTML(question.description)}</p>
        ${answeredByTeacher ? "" : answerButton}
        ${answerPreviews}
    </article>`;
}

function renderQuestions() {
    const questions = dashboardData.questions;
    document.getElementById("recentQuestions").innerHTML = questions.length
        ? questions.slice(0, 3).map(function (item) { return questionCard(item); }).join("")
        : '<p class="form-note">No questions have been posted yet.</p>';

    document.getElementById("questionWall").innerHTML = questions.length
        ? questions.map(function (item) { return questionCard(item, true); }).join("")
        : '<p class="form-note">No questions have been posted yet.</p>';

    const tagged = questions.filter(function (item) { return item.teacher_id !== null; });
    document.getElementById("taggedQuestions").innerHTML = tagged.length
        ? tagged.map(function (item) { return questionCard(item); }).join("")
        : '<p class="form-note">No questions are tagged to your account.</p>';

    const answeredByMe = questions.filter(function (item) {
        return (item.answer_records || []).some(function (answer) {
            return Number(answer.teacher_id) === Number(dashboardData.profile.id);
        });
    });
    document.getElementById("answeredQuestions").innerHTML = answeredByMe.length
        ? answeredByMe.map(function (item) { return questionCard(item, false, true); }).join("")
        : '<p class="form-note">You have not answered any questions yet.</p>';

    const subjectGrid = document.getElementById("teacherSubjects");
    const subjects = dashboardData.statistics.subjects || [];
    subjectGrid.innerHTML = subjects.length ? subjects.map(function (subject) {
        const count = questions.filter(function (item) { return item.subject === subject; }).length;
        return `<article class="subject-card"><span>▣</span><h3>${escapeHTML(subject)}</h3>
            <p>${count} question${count === 1 ? "" : "s"} visible on the wall</p></article>`;
    }).join("") : '<p class="form-note">No subject activity is available yet.</p>';
}

function renderMessages() {
    const container = document.getElementById("teacherMessages");
    if (!container) return;
    container.innerHTML = dashboardData.messages.length ? dashboardData.messages.map(function (message) {
        return `<article class="question-card message-card">
            <div class="question-meta"><span class="status status-tagged">From ${escapeHTML(message.sender_name)}</span>
                <time>${escapeHTML(displayTime(message.created_at))}</time></div>
            <p class="question-byline">${escapeHTML(message.sender_email)}</p>
            <p class="question-description">${escapeHTML(message.content)}</p>
        </article>`;
    }).join("") : '<p class="form-note">You have no student messages.</p>';
}

function renderNotifications() {
    const container = document.getElementById("teacherNotifications");
    if (!container) return;
    container.innerHTML = dashboardData.notifications.length ? dashboardData.notifications.map(function (item) {
        const icon = item.kind === "student_message" ? "✉" : "＠";
        return `<article class="notification-item ${item.is_read ? "read" : "unread"}"
            data-notification-id="${item.id}" role="button" tabindex="0">
            <span class="notification-icon">${icon}</span><div><strong>${escapeHTML(item.title)}</strong>
                <p>${escapeHTML(item.content)}</p><small>${escapeHTML(displayTime(item.created_at))}</small></div>
        </article>`;
    }).join("") : '<p class="form-note">You have no notifications.</p>';

    container.querySelectorAll("[data-notification-id]").forEach(function (item) {
        item.addEventListener("click", async function () {
            const selected = dashboardData.notifications.find(function (notification) {
                return Number(notification.id) === Number(item.dataset.notificationId);
            });
            if (!selected || selected.is_read) return;
            try {
                await apiRequest(
                    urls.notificationReadTemplate.replace("/0/read", `/${selected.id}/read`),
                    "POST", {}
                );
                selected.is_read = 1;
                updateNotificationBadges();
                renderNotifications();
            } catch (error) {
                showToast(error.message);
            }
        });
    });
}

function updateNotificationBadges() {
    const unread = dashboardData.notifications.filter(function (item) { return !item.is_read; }).length;
    document.getElementById("notificationBadge").textContent = unread;
    document.getElementById("notificationBadge").hidden = unread === 0;
    document.getElementById("topNotificationCount").textContent = unread;
    document.getElementById("topNotificationCount").parentElement.style.display = unread ? "grid" : "none";
}

async function loadDashboard() {
    dashboardData = await apiRequest(urls.dashboard);
    renderTeacherProfile(dashboardData.profile);
    renderQuestions();
    renderMessages();
    renderNotifications();

    const statistics = dashboardData.statistics;
    document.getElementById("taggedCount").textContent = statistics.tagged;
    document.getElementById("taggedBadge").textContent = statistics.tagged;
    document.getElementById("pendingTaggedCount").textContent = statistics.pending_tagged;
    document.getElementById("pendingCount").textContent = statistics.pending;
    document.getElementById("answeredCount").textContent = statistics.answered;
    document.getElementById("subjectCount").textContent = statistics.subjects.length;
    document.getElementById("messageBadge").textContent = dashboardData.messages.length;
    document.getElementById("messageBadge").hidden = dashboardData.messages.length === 0;
    updateNotificationBadges();
}

document.getElementById("markTeacherNotificationsRead").addEventListener("click", async function () {
    try {
        await apiRequest(urls.notificationsReadAll, "POST", {});
        dashboardData.notifications.forEach(function (item) { item.is_read = 1; });
        updateNotificationBadges();
        renderNotifications();
        showToast("All notifications marked as read.");
    } catch (error) {
        showToast(error.message);
    }
});

loadDashboard().catch(function (error) {
    showToast(error.message);
});
