
document.addEventListener("DOMContentLoaded", function () {

    const urls = window.studentSpaceUrls;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    let questions = [];
    let teachers = [];
    let notifications = [];
    let statistics = {};
    let profile = null;

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

    function branchLabel(value) {
        return {
            CME: "Computer Engineering",
            EEE: "Electrical and Electronic Engineering",
            CIVIL: "Civil Engineering",
            CCP: "Commercial and Computer Engineering"
        }[value] || value || "";
    }

    function yearLabel(value) {
        return { "1": "1st Year", "2": "2nd Year", "3": "3rd Year" }[value] || value || "";
    }

    async function loadDashboard() {
        const data = await apiRequest(urls.dashboard);
        profile = data.profile;
        questions = data.questions;
        teachers = data.teachers;
        notifications = data.notifications;
        statistics = data.statistics;
        renderProfile();
        renderTeachers();
        renderDashboard();
        renderWall();
        renderMyQuestions();
        updateNotificationCount();
        if (document.querySelector(".view.active-view").id === "notificationsView") {
            renderNotifications();
        }
    }

    function renderTeachers() {
        const grid = document.getElementById("teacherGrid");
        const select = document.getElementById("teacherSelect");
        if (select) {
            select.innerHTML = '<option value="">Select teacher</option>' +
                teachers.map(function (teacher) {
                    return `<option value="${teacher.id}">${escapeHTML(teacher.teacher_name)}</option>`;
                }).join("");
        }
        if (!grid) return;
        grid.innerHTML = teachers.length ? teachers.map(function (teacher) {
            return `<article class="teacher-card" data-teacher-id="${teacher.id}">
                <div class="teacher-avatar">${escapeHTML(teacher.teacher_name.slice(0, 2).toUpperCase())}</div>
                <h3>${escapeHTML(teacher.teacher_name)}</h3>
                <p>${escapeHTML(teacher.branch)}</p>
                <button class="message-button" type="button">✉ Message</button>
            </article>`;
        }).join("") : '<p>No teacher accounts are available yet.</p>';
    }

    /* ================= PROFILE DATA ================= */

    function renderProfile() {
        if (!profile) return;
        document.getElementById("profileName").textContent = profile.name;
        document.getElementById("profileEmail").textContent = profile.mail;
        document.getElementById("profileBranch").textContent = branchLabel(profile.branch);
        document.getElementById("profileYear").textContent = yearLabel(profile.year);
        document.getElementById("profileAvatar").textContent = profile.name.charAt(0).toUpperCase();
        document.getElementById("headerStudentName").textContent = profile.name;
        document.getElementById("welcomeStudentName").textContent = profile.name + "! 👋";
        document.querySelector(".user-avatar").textContent = profile.name.charAt(0).toUpperCase();
        document.querySelector(".college small").textContent = branchLabel(profile.branch);
    }

    function openProfileEditor() {
        if (!profile) return;
        document.getElementById("editName").value = profile.name;
        document.getElementById("editEmail").value = profile.mail;
        document.getElementById("editBranch").value = profile.branch;
        document.getElementById("editYear").value = profile.year;
        document.getElementById("profileEditForm").hidden = false;
        document.getElementById("editName").focus();
    }

    function closeProfileEditor() {
        document.getElementById("profileEditForm").hidden = true;
    }

    function showToast(message) {

        const toast = document.getElementById("toast");

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(window.toastTimer);

        window.toastTimer = setTimeout(function () {
            toast.classList.remove("show");
        }, 2200);
    }


    function avatarClass(name) {

        const first = name.charAt(0).toLowerCase();

        if ("p".includes(first)) return "purple";
        if ("r".includes(first)) return "green";
        if ("s".includes(first)) return "blue";
        if ("a".includes(first)) return "pink";

        return "yellow";
    }


    function questionStatus(question) {

        if (question.teacherTagged) {
            return '<span class="status teacher">● Teacher Tagged</span>';
        }

        if (question.status === "answered") {
            return '<span class="status answered">● Answered</span>';
        }

        return '<span class="status pending">● Unanswered</span>';
    }


    function questionCard(question, includeAnswerButton = false) {

        const tags = `
            <div class="tags">
                <span>${escapeHTML(question.subject)}</span>
                ${question.teacherTagged && question.teacher_name
                    ? `<span>Tagged to ${escapeHTML(question.teacher_name)}</span>` : ""}
            </div>
        `;

        // Students can answer other students' unanswered questions,
        // but they must never answer their own questions.
        // If a teacher is tagged, the question is waiting for the teacher,
        // so the student-side dashboard should not show an Answer button.
        const canStudentAnswer =
            includeAnswerButton &&
            question.status === "unanswered" &&
            question.student_id !== profile.id &&
            !question.teacherTagged;

        const answerButton = canStudentAnswer
            ? `<button class="answer-button" type="button" data-answer-id="${question.id}">Answer</button>`
            : "";

        const answers = (question.answer_records || []).map(function (answer) {
            return `<div class="answer-preview"><strong>${escapeHTML(answer.author_name)}</strong>
                <p>${escapeHTML(answer.content)}</p><small>${escapeHTML(displayTime(answer.created_at))}</small></div>`;
        }).join("");

        return `
            <article class="question-card">
                <div class="question-avatar ${avatarClass(question.author)}">
                    ${escapeHTML(question.author.charAt(0).toUpperCase())}
                </div>

                <div class="question-main">
                    <h3>${escapeHTML(question.title)}</h3>
                    ${tags}
                    <p class="question-description">${escapeHTML(question.description)}</p>
                    <p>
                        Posted by <b>${escapeHTML(question.author)}</b>
                        · ${escapeHTML(displayTime(question.time))}
                        · ${question.answers} answer${question.answers === 1 ? "" : "s"}
                    </p>
                    ${answers}
                </div>

                ${questionStatus(question)}
                ${answerButton}
            </article>
        `;
    }


    function escapeHTML(value) {

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    /* ================= VIEW SYSTEM ================= */

    const views = {
        dashboard: "dashboardView",
        "question-wall": "questionWallView",
        "ask-question": "askQuestionView",
        "my-questions": "myQuestionsView",
        teachers: "teachersView",
        subjects: "subjectsView",
        profile: "profileView",
        notifications: "notificationsView",
        settings: "settingsView"
    };


    function openView(viewName) {

        Object.values(views).forEach(function (id) {
            document.getElementById(id).classList.remove("active-view");
        });

        document.getElementById(views[viewName]).classList.add("active-view");

        document.querySelectorAll(".nav-link[data-view]").forEach(function (link) {
            link.classList.toggle(
                "active",
                link.dataset.view === viewName
            );
        });

        document.getElementById("sidebar").classList.remove("open");

        document.getElementById("userMenu").classList.remove("open");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        if (viewName === "dashboard") renderDashboard();
        if (viewName === "question-wall") renderWall();
        if (viewName === "my-questions") renderMyQuestions();
        if (viewName === "profile") renderProfile();
        if (viewName === "notifications") renderNotifications();
    }


    document.querySelectorAll("[data-view]").forEach(function (element) {

        element.addEventListener("click", function (event) {

            event.preventDefault();

            openView(element.dataset.view);
        });
    });


    /* ================= DASHBOARD ================= */

    function renderDashboard() {

        const recent = questions.slice(0, 5);

        document.getElementById("recentQuestions").innerHTML = recent.length
            ? recent.map(q => questionCard(q, false)).join("")
            : '<p>No questions have been posted yet.</p>';

        document.getElementById("askedCount").textContent = statistics.asked || 0;
        document.getElementById("answeredCount").textContent = statistics.answered || 0;
        document.getElementById("pendingCount").textContent = statistics.pending || 0;
        document.getElementById("givenCount").textContent = statistics.answers_given || 0;
    }


    /* ================= QUESTION WALL ================= */

    let currentFilter = "all";

    function renderWall() {

        const search = document
            .getElementById("searchInput")
            .value
            .trim()
            .toLowerCase();

        let filtered = questions.filter(function (question) {

            const text =
                question.title + " " +
                question.subject + " " +
                question.description;

            const matchesSearch =
                text.toLowerCase().includes(search);

            let matchesFilter = true;

            if (currentFilter === "unanswered") {
                matchesFilter = question.status === "unanswered";
            }

            if (currentFilter === "answered") {
                matchesFilter = question.status === "answered";
            }

            if (currentFilter === "teacher") {
                matchesFilter = question.teacherTagged;
            }

            return matchesSearch && matchesFilter;
        });

        const wall = document.getElementById("wallQuestions");

        if (filtered.length === 0) {

            wall.innerHTML = `
                <div class="panel">
                    <p>No questions found.</p>
                </div>
            `;

            return;
        }

        wall.innerHTML =
            filtered.map(q => questionCard(q, true)).join("");

        document.querySelectorAll("[data-answer-id]").forEach(function (button) {

            button.addEventListener("click", function () {

                openAnswerModal(Number(button.dataset.answerId));
            });
        });
    }


    document.querySelectorAll(".filter").forEach(function (button) {

        button.addEventListener("click", function () {

            document.querySelectorAll(".filter").forEach(
                b => b.classList.remove("active")
            );

            button.classList.add("active");

            currentFilter = button.dataset.filter;

            renderWall();
        });
    });


    /* ================= SEARCH ================= */

    document.getElementById("searchInput").addEventListener(
        "input",
        function () {

            const activeView =
                document.querySelector(".view.active-view").id;

            if (activeView === "questionWallView") {
                renderWall();
            } else {
                openView("question-wall");
            }
        }
    );


    /* ================= ASK QUESTION ================= */

    const tagTeacher = document.getElementById("tagTeacher");
    const teacherSelect = document.getElementById("teacherSelect");

    tagTeacher.addEventListener("change", function () {

        teacherSelect.disabled = !tagTeacher.checked;

        if (!tagTeacher.checked) {
            teacherSelect.value = "";
        }
    });


    document.getElementById("questionForm").addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const title = document.getElementById("title").value.trim();
            const subject = document.getElementById("subject").value;
            const description =
                document.getElementById("description").value.trim();

            if (!title || !subject || !description) {
                showToast("Please fill all the fields.");
                return;
            }
            if (tagTeacher.checked && !teacherSelect.value) {
                showToast("Select the teacher you want to tag.");
                return;
            }

            try {
                await apiRequest(urls.questions, "POST", {
                    title: title,
                    subject: subject,
                    description: description,
                    teacher_id: tagTeacher.checked ? teacherSelect.value : null
                });
                event.target.reset();
                teacherSelect.disabled = true;
                await loadDashboard();
                showToast("Question posted successfully.");
                openView("my-questions");
            } catch (error) {
                showToast(error.message);
            }
        }
    );


    /* ================= MY QUESTIONS ================= */

    function renderMyQuestions() {

        const mine = questions.filter(q => q.student_id === profile.id);

        const container = document.getElementById("myQuestions");

        if (mine.length === 0) {

            container.innerHTML = `
                <div class="panel">
                    <p>You haven't asked any questions yet.</p>
                </div>
            `;

            return;
        }

        container.innerHTML = mine.map(function (question) {

            return `
                <article class="my-question">

                    <div>
                        <h3>${escapeHTML(question.title)}</h3>
                        <p>
                            ${escapeHTML(question.subject)}
                            · ${escapeHTML(displayTime(question.time))}
                            · ${question.answers} answer${question.answers === 1 ? "" : "s"}
                        </p>
                        <p class="question-description">${escapeHTML(question.description)}</p>
                    </div>

                    ${questionStatus(question)}

                </article>
            `;

        }).join("");
    }


    /* ================= ANSWERING ================= */

    let selectedQuestionId = null;

    function openAnswerModal(questionId) {

        const question =
            questions.find(q => Number(q.id) === Number(questionId));

        if (!question) return;

        // Extra protection: the UI must never allow a student to answer
        // their own question or a question that has a teacher tagged.
        if (question.student_id === profile.id) {
            showToast("You cannot answer your own question.");
            return;
        }

        if (question.teacherTagged) {
            showToast("This question is waiting for the tagged teacher.");
            return;
        }

        selectedQuestionId = questionId;

        document.getElementById("modalQuestion").textContent =
            question.title;

        document.getElementById("answerText").value = "";

        document.getElementById("answerModal").classList.add("open");
    }


    document.getElementById("closeModal").addEventListener(
        "click",
        function () {

            document.getElementById("answerModal")
                .classList.remove("open");
        }
    );


    document.getElementById("submitAnswer").addEventListener(
        "click",
        async function () {

            const answer =
                document.getElementById("answerText").value.trim();

            if (!answer) {
                showToast("Write an answer first.");
                return;
            }

            const question =
                questions.find(q => Number(q.id) === Number(selectedQuestionId));

            if (!question) return;

            try {
                await apiRequest(
                    urls.answerTemplate.replace("/0/answers", `/${question.id}/answers`),
                    "POST",
                    { content: answer }
                );
                document.getElementById("answerModal").classList.remove("open");
                await loadDashboard();
                showToast("Your answer was added.");
            } catch (error) {
                showToast(error.message);
            }
        }
    );


    /* Close modal when clicking outside */
    document.getElementById("answerModal").addEventListener(
        "click",
        function (event) {

            if (event.target === this) {
                this.classList.remove("open");
            }
        }
    );


    /* ================= TEACHERS / MESSAGES ================= */

    let selectedTeacherId = null;

    function openTeacherMessage(teacherId, teacherName) {
        selectedTeacherId = teacherId;

        document.getElementById("messageTeacherName").textContent =
            teacherName;

        document.getElementById("teacherMessageText").value = "";
        document.getElementById("messageModal").classList.add("open");

        setTimeout(function () {
            document.getElementById("teacherMessageText").focus();
        }, 100);
    }

    function closeTeacherMessage() {
        document.getElementById("messageModal").classList.remove("open");
        selectedTeacherId = null;
    }

    document.getElementById("teacherGrid").addEventListener("click", function (event) {
        const button = event.target.closest(".message-button");
        if (!button) return;
        const card = button.closest(".teacher-card");
        openTeacherMessage(card.dataset.teacherId, card.querySelector("h3").textContent.trim());
    });

    document.getElementById("closeMessageModal")
        .addEventListener("click", closeTeacherMessage);

    document.getElementById("cancelMessage")
        .addEventListener("click", closeTeacherMessage);

    document.getElementById("messageModal")
        .addEventListener("click", function (event) {
            if (event.target === this) {
                closeTeacherMessage();
            }
        });

    document.getElementById("sendTeacherMessage")
        .addEventListener("click", async function () {
            const text = document.getElementById("teacherMessageText")
                .value.trim();

            if (!selectedTeacherId) return;

            if (!text) {
                showToast("Write a message first.");
                return;
            }

            const teacher = document.getElementById("messageTeacherName").textContent;
            try {
                await apiRequest(urls.messages, "POST", {
                    teacher_id: selectedTeacherId,
                    content: text
                });
                closeTeacherMessage();
                await loadDashboard();
                showToast("Message sent to " + teacher + ".");
            } catch (error) {
                showToast(error.message);
            }
        });


    /* ================= SUBJECTS ================= */

    document.querySelectorAll(".subject-card").forEach(
        function (button) {

            button.addEventListener("click", function () {

                const subject = button.dataset.subject;

                document.getElementById("searchInput").value =
                    subject;

                currentFilter = "all";

                document.querySelectorAll(".filter").forEach(
                    b => b.classList.remove("active")
                );

                document
                    .querySelector('.filter[data-filter="all"]')
                    .classList.add("active");

                openView("question-wall");
            });
        }
    );


    /* ================= PROFILE MENU ================= */

    document.getElementById("userArea").addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            document
                .getElementById("userMenu")
                .classList.toggle("open");
        }
    );


    document.addEventListener("click", function () {

        document
            .getElementById("userMenu")
            .classList.remove("open");
    });


    document.getElementById("userMenu").addEventListener(
        "click",
        function (event) {
            event.stopPropagation();
        }
    );


    document.querySelectorAll("#userMenu [data-view]").forEach(
        function (button) {

            button.addEventListener("click", function () {

                openView(button.dataset.view);
            });
        }
    );


    /* ================= PROFILE EDITING ================= */

    document.getElementById("editProfileBtn").addEventListener("click", function () {
        openProfileEditor();
    });

    document.getElementById("cancelProfileEdit").addEventListener("click", function () {
        closeProfileEditor();
    });

    document.getElementById("profileEditForm").addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("editName").value.trim();
        const email = document.getElementById("editEmail").value.trim();
        const branch = document.getElementById("editBranch").value;
        const year = document.getElementById("editYear").value;

        if (!name || !email || !branch || !year) {
            showToast("Please fill all profile fields.");
            return;
        }

        try {
            const result = await apiRequest(urls.profile, "POST", { name, email, branch, year });
            profile = result.profile;
            renderProfile();
            closeProfileEditor();
            showToast("Profile updated successfully.");
        } catch (error) {
            showToast(error.message);
        }
    });


    /* ================= NOTIFICATIONS ================= */

    function renderNotifications() {
        const list = document.getElementById("notificationsList");
        if (!list) return;
        if (!notifications.length) {
            list.innerHTML = `<div class="notifications-empty"><div>🔔</div><h3>No notifications</h3><p>You're all caught up.</p></div>`;
            return;
        }

        list.innerHTML = notifications.map(function (item) {
            const icon = item.kind === "tagged_question" ? "👨‍🏫" :
                item.kind === "student_message" ? "✉" : "💬";
            return `
                <article class="notification-item ${item.is_read ? "read" : "unread"}" data-notification-id="${item.id}">
                    <div class="notification-item-icon">${icon}</div>
                    <div class="notification-item-content">
                        <div class="notification-item-top">
                            <h3>${escapeHTML(item.title)}</h3>
                            <span>${escapeHTML(displayTime(item.created_at))}</span>
                        </div>
                        <p>${escapeHTML(item.content)}</p>
                    </div>
                    ${item.is_read ? "" : '<span class="notification-dot" title="Unread"></span>'}
                </article>`;
        }).join("");

        list.querySelectorAll(".notification-item").forEach(function (item) {
            item.addEventListener("click", async function () {
                const selected = notifications.find(function (entry) {
                    return Number(entry.id) === Number(item.dataset.notificationId);
                });
                if (!selected || selected.is_read) return;
                try {
                    await apiRequest(
                        urls.notificationReadTemplate.replace("/0/read", `/${selected.id}/read`),
                        "POST",
                        {}
                    );
                    selected.is_read = 1;
                    updateNotificationCount();
                    renderNotifications();
                } catch (error) {
                    showToast(error.message);
                }
            });
        });
    }

    function updateNotificationCount() {
        const count = notifications.filter(function (item) { return !item.is_read; }).length;
        const badge = document.getElementById("notificationCount");
        badge.textContent = count;
        badge.style.display = count ? "block" : "none";
    }

    document.getElementById("notificationBtn").addEventListener("click", function () {
        openView("notifications");
    });

    document.getElementById("markAllNotificationsRead").addEventListener("click", async function () {
        try {
            await apiRequest(urls.notificationsReadAll, "POST", {});
            notifications.forEach(function (item) { item.is_read = 1; });
            updateNotificationCount();
            renderNotifications();
            showToast("All notifications marked as read.");
        } catch (error) {
            showToast(error.message);
        }
    });


    /* ================= MOBILE SIDEBAR ================= */

    document.getElementById("menuBtn").addEventListener(
        "click",
        function () {

            document.getElementById("sidebar")
                .classList.toggle("open");
        }
    );

    document.getElementById("menuLogout").addEventListener("click", function () {
        window.location.href = logoutUrl;
    });

    document.getElementById("changePasswordForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        const currentPassword = document.getElementById("currentPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const message = document.getElementById("passwordMessage");
        message.className = "password-message show";

        if (!currentPassword || !newPassword || !confirmPassword) {
            message.classList.add("error");
            message.textContent = "Please fill in all password fields.";
            return;
        }
        if (newPassword.length < 8 || newPassword !== confirmPassword) {
            message.classList.add("error");
            message.textContent = newPassword.length < 8
                ? "New password must contain at least 8 characters."
                : "New password and confirmation do not match.";
            return;
        }

        try {
            await apiRequest(urls.changePassword, "POST", {
                current_password: currentPassword,
                new_password: newPassword
            });
            message.classList.add("success");
            message.textContent = "Password changed successfully.";
            event.target.reset();
        } catch (error) {
            message.classList.add("error");
            message.textContent = error.message;
        }
    });


    /* ================= INITIAL LOAD ================= */

    loadDashboard().catch(function (error) {
        showToast(error.message);
    });

});
