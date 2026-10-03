document.addEventListener("DOMContentLoaded", function () {

    const STORAGE_KEY = "studentSpaceQuestions";
    const CURRENT_STUDENT = "Rahul";

    const defaultQuestions = [
        {
            id: 1,
            title: "Why is normalization required in DBMS?",
            subject: "DBMS",
            description: "I want to understand why normalization is needed and how it reduces redundancy.",
            author: "Priya",
            time: "2 hours ago",
            answers: 3,
            status: "answered",
            teacherTagged: false
        },
        {
            id: 2,
            title: "Difference between TCP and UDP?",
            subject: "Computer Networks",
            description: "Can someone explain the main differences between TCP and UDP with a simple example?",
            author: CURRENT_STUDENT,
            time: "5 hours ago",
            answers: 1,
            status: "unanswered",
            teacherTagged: false
        },
        {
            id: 3,
            title: "How does virtual memory work?",
            subject: "Operating Systems",
            description: "How does an operating system use virtual memory?",
            author: "Suresh",
            time: "1 day ago",
            answers: 4,
            status: "answered",
            teacherTagged: false
        },
        {
            id: 4,
            title: "Can someone explain polymorphism with an example?",
            subject: "Java",
            description: "I understand the definition but need a simple practical example.",
            author: "Anjali",
            time: "1 day ago",
            answers: 2,
            status: "answered",
            teacherTagged: true
        },
        {
            id: 5,
            title: "What is the difference between primary key and foreign key?",
            subject: "DBMS",
            description: "I am confused about where primary keys and foreign keys are used.",
            author: "Deepak",
            time: "2 days ago",
            answers: 0,
            status: "unanswered",
            teacherTagged: false
        }
    ];

    let questions = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!Array.isArray(questions) || questions.length === 0) {
        questions = defaultQuestions;
        saveQuestions();
    }


    /* ================= BASIC HELPERS ================= */

    function saveQuestions() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    }

    /* ================= PROFILE DATA ================= */

    const PROFILE_KEY = "studentSpaceProfile";

    const defaultProfile = {
        name: "Rahul Kumar",
        email: "rahul@example.com",
        branch: "Computer Engineering",
        year: "3rd Year"
    };

    let profile = JSON.parse(localStorage.getItem(PROFILE_KEY));

    if (!profile || typeof profile !== "object") {
        profile = { ...defaultProfile };
        saveProfile();
    }

    function saveProfile() {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }

    function renderProfile() {
        document.getElementById("profileName").textContent = profile.name;
        document.getElementById("profileEmail").textContent = profile.email;
        document.getElementById("profileBranch").textContent = profile.branch;
        document.getElementById("profileYear").textContent = profile.year;
        document.getElementById("profileAvatar").textContent = profile.name.charAt(0).toUpperCase();
        document.getElementById("headerStudentName").textContent = profile.name;
        document.getElementById("welcomeStudentName").textContent = profile.name + "! 👋";
    }

    function openProfileEditor() {
        document.getElementById("editName").value = profile.name;
        document.getElementById("editEmail").value = profile.email;
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
                <span>Computer Engineering</span>
            </div>
        `;

        // Students can answer other students' unanswered questions,
        // but they must never answer their own questions.
        // If a teacher is tagged, the question is waiting for the teacher,
        // so the student-side dashboard should not show an Answer button.
        const canStudentAnswer =
            includeAnswerButton &&
            question.status === "unanswered" &&
            question.author !== CURRENT_STUDENT &&
            !question.teacherTagged;

        const answerButton = canStudentAnswer
            ? `<button class="answer-button" data-answer-id="${question.id}">Answer</button>`
            : "";

        return `
            <article class="question-card">
                <div class="question-avatar ${avatarClass(question.author)}">
                    ${escapeHTML(question.author.charAt(0).toUpperCase())}
                </div>

                <div class="question-main">
                    <h3>${escapeHTML(question.title)}</h3>
                    ${tags}
                    <p>
                        Posted by <b>${escapeHTML(question.author)}</b>
                        · ${escapeHTML(question.time)}
                        · ${question.answers} answer${question.answers === 1 ? "" : "s"}
                    </p>
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

        document.getElementById("recentQuestions").innerHTML =
            recent.map(q => questionCard(q, false)).join("");

        const myQuestions = questions.filter(q => q.author === CURRENT_STUDENT);

        document.getElementById("askedCount").textContent =
            12 + myQuestions.length;

        document.getElementById("answeredCount").textContent =
            8 + myQuestions.filter(q => q.status === "answered").length;

        document.getElementById("pendingCount").textContent =
            4 + myQuestions.filter(q => q.status === "unanswered").length;
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
        function (event) {

            event.preventDefault();

            const title = document.getElementById("title").value.trim();
            const subject = document.getElementById("subject").value;
            const description =
                document.getElementById("description").value.trim();

            if (!title || !subject || !description) {
                showToast("Please fill all the fields.");
                return;
            }

            const newQuestion = {
                id: Date.now(),
                title: title,
                subject: subject,
                description: description,
                author: CURRENT_STUDENT,
                time: "Just now",
                answers: 0,
                status: "unanswered",
                teacherTagged: tagTeacher.checked,
                teacher: teacherSelect.value
            };

            questions.unshift(newQuestion);

            saveQuestions();

            event.target.reset();
            teacherSelect.disabled = true;

            showToast("Question posted successfully.");

            openView("my-questions");
        }
    );


    /* ================= MY QUESTIONS ================= */

    function renderMyQuestions() {

        const mine = questions.filter(q => q.author === CURRENT_STUDENT);

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
                            · ${escapeHTML(question.time)}
                            · ${question.answers} answer${question.answers === 1 ? "" : "s"}
                        </p>
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
            questions.find(q => q.id === questionId);

        if (!question) return;

        // Extra protection: the UI must never allow a student to answer
        // their own question or a question that has a teacher tagged.
        if (question.author === CURRENT_STUDENT) {
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
        function () {

            const answer =
                document.getElementById("answerText").value.trim();

            if (!answer) {
                showToast("Write an answer first.");
                return;
            }

            const question =
                questions.find(q => q.id === selectedQuestionId);

            if (!question) return;

            question.answers += 1;
            question.status = "answered";

            saveQuestions();

            document.getElementById("answerModal")
                .classList.remove("open");

            showToast("Your answer was added.");

            renderWall();
            renderDashboard();
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

    let selectedTeacher = "";
    const MESSAGE_KEY = "studentSpaceMessages";

    function openTeacherMessage(teacherName) {
        selectedTeacher = teacherName;

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
        selectedTeacher = "";
    }

    document.querySelectorAll(".message-button").forEach(
        function (button) {

            button.addEventListener("click", function () {
                const teacher = button.closest(".teacher-card")
                    .querySelector("h3").textContent.trim();

                openTeacherMessage(teacher);
            });
        }
    );

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
        .addEventListener("click", function () {
            const text = document.getElementById("teacherMessageText")
                .value.trim();

            if (!selectedTeacher) return;

            if (!text) {
                showToast("Write a message first.");
                return;
            }

            const messages = JSON.parse(
                localStorage.getItem(MESSAGE_KEY) || "[]"
            );

            messages.push({
                id: Date.now(),
                from: CURRENT_STUDENT,
                to: selectedTeacher,
                message: text,
                time: new Date().toLocaleString()
            });

            localStorage.setItem(MESSAGE_KEY, JSON.stringify(messages));

            const teacher = selectedTeacher;
            closeTeacherMessage();
            showToast("Message sent to " + teacher + ".");
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

    document.getElementById("profileEditForm").addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("editName").value.trim();
        const email = document.getElementById("editEmail").value.trim();
        const branch = document.getElementById("editBranch").value;
        const year = document.getElementById("editYear").value;

        if (!name || !email || !branch || !year) {
            showToast("Please fill all profile fields.");
            return;
        }

        profile = { name, email, branch, year };
        saveProfile();
        renderProfile();
        closeProfileEditor();
        showToast("Profile updated successfully.");
    });


    /* ================= NOTIFICATIONS ================= */

    const NOTIFICATIONS_KEY = "studentSpaceNotifications";

    const defaultNotifications = [
        { id: 1, type: "answer", icon: "💬", title: "Someone answered your question", text: "Your question about TCP vs UDP received a new answer.", time: "10 min ago", read: false },
        { id: 2, type: "teacher", icon: "👨‍🏫", title: "Teacher responded", text: "Mr. K. Srinivas responded to a question you tagged him in.", time: "1 hour ago", read: false },
        { id: 3, type: "announcement", icon: "📢", title: "New college announcement", text: "Internal exams start from 20th September 2026.", time: "Yesterday", read: false }
    ];

    function getNotifications() {
        const saved = localStorage.getItem(NOTIFICATIONS_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {}
        }
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(defaultNotifications));
        return [...defaultNotifications];
    }

    function saveNotifications(items) {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items));
    }

    function renderNotifications() {
        const list = document.getElementById("notificationsList");
        if (!list) return;

        const items = getNotifications();

        if (!items.length) {
            list.innerHTML = `<div class="notifications-empty"><div>🔔</div><h3>No notifications</h3><p>You're all caught up.</p></div>`;
            return;
        }

        list.innerHTML = items.map(function (item) {
            return `
                <article class="notification-item ${item.read ? "read" : "unread"}" data-notification-id="${item.id}">
                    <div class="notification-item-icon">${item.icon}</div>
                    <div class="notification-item-content">
                        <div class="notification-item-top">
                            <h3>${escapeHTML(item.title)}</h3>
                            <span>${escapeHTML(item.time)}</span>
                        </div>
                        <p>${escapeHTML(item.text)}</p>
                    </div>
                    ${item.read ? "" : '<span class="notification-dot" title="Unread"></span>'}
                </article>`;
        }).join("");

        list.querySelectorAll(".notification-item").forEach(function (item) {
            item.addEventListener("click", function () {
                const id = Number(item.dataset.notificationId);
                const notifications = getNotifications();
                const selected = notifications.find(function (n) { return n.id === id; });
                if (selected && !selected.read) {
                    selected.read = true;
                    saveNotifications(notifications);
                    updateNotificationCount();
                    renderNotifications();
                }
            });
        });
    }

    function updateNotificationCount() {
        const count = getNotifications().filter(function (item) { return !item.read; }).length;
        const badge = document.getElementById("notificationCount");
        badge.textContent = count;
        badge.style.display = count ? "block" : "none";
    }

    document.getElementById("notificationBtn").addEventListener("click", function () {
        openView("notifications");
    });

    document.getElementById("markAllNotificationsRead").addEventListener("click", function () {
        const notifications = getNotifications().map(function (item) {
            return { ...item, read: true };
        });
        saveNotifications(notifications);
        updateNotificationCount();
        renderNotifications();
        showToast("All notifications marked as read.");
    });


    /* ================= MOBILE SIDEBAR ================= */

    document.getElementById("menuBtn").addEventListener(
        "click",
        function () {

            document.getElementById("sidebar")
                .classList.toggle("open");
        }
    );


    /* ================= LOGOUT ================= */

    function logout() {

        showToast("Logging out...");

        setTimeout(function () {
            window.location.href = "StudentLogin.html";
        }, 700);
    }

    document.getElementById("logoutBtn")
        .addEventListener("click", function (event) {
            event.preventDefault();
            logout();
        });

    document.getElementById("menuLogout")
        .addEventListener("click", logout);


    /* ================= INITIAL LOAD ================= */

    renderProfile();
    renderDashboard();
    updateNotificationCount();

});
