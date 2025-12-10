document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION & INITIALIZATION ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'student') {
        alert('Access Denied. Please log in as a student.');
        window.location.href = 'index.html';
        return;
    }

    // --- GLOBAL VARIABLES ---
    let quizzes = JSON.parse(localStorage.getItem('quizzes')) || [];
    let attempts = JSON.parse(localStorage.getItem('studentAttempts')) || [];
    let currentQuizId = null; 
    let currentQuizVersion = null;

    // --- DOM ELEMENTS ---
    const navAuthContainer = document.getElementById('nav-auth-container');
    
    // Main Views
    const dashboardView = document.getElementById('dashboard-view');
    const quizViewContainer = document.getElementById('quiz-view-container');
    const profileView = document.getElementById('profile-view');
    
    // Dashboard
    const dashboardTabs = document.querySelectorAll('#dashboard-view .tab-btn');
    const dashboardTabContents = document.querySelectorAll('#dashboard-view .tab-content');
    const availableListContainer = document.getElementById('available-list-container');
    const attemptsListContainer = document.getElementById('attempts-list-container');

    // Quiz View
    const quizViewTitle = document.getElementById('quiz-view-title');
    const quizViewDescription = document.getElementById('quiz-view-description');
    const quizQuestionsArea = document.getElementById('quiz-questions-area');
    const quizAttemptForm = document.getElementById('quiz-attempt-form');
    
    // Profile View
    const backToDashBtn = document.getElementById('back-to-dash-btn');
    const profileTabs = document.querySelectorAll('.profile-tab-btn');
    const profileTabContents = document.querySelectorAll('.profile-tab-content');
    const changePasswordForm = document.getElementById('change-password-form');
    
    // Profile Filter Elements
    const filterSubjectStud = document.getElementById('filter-subject-stud');
    const filterStatusStud = document.getElementById('filter-status-stud');
    const filterSortStud = document.getElementById('filter-sort-stud');
    const pFilteredListContainerStud = document.getElementById('p-filtered-list-container-stud');


    // --- INITIALIZE PAGE ---
    function init() {
        navAuthContainer.innerHTML = `
            <a href="#" id="profile-link">${currentUser.username}</a>
            <button id="logout-btn" class="btn btn-secondary" style="width: auto; padding: 8px 12px;">Logout</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', logout);
        document.getElementById('profile-link').addEventListener('click', (e) => {
            e.preventDefault();
            loadProfileData();
            showMainView('profile');
        });

        dashboardTabs.forEach(tab => tab.addEventListener('click', () => switchDashboardTab(tab.dataset.tab)));
        profileTabs.forEach(tab => tab.addEventListener('click', () => switchProfileTab(tab.dataset.tab)));
        
        // Listener for quiz submission
        quizAttemptForm.addEventListener('submit', submitQuiz);
        
        backToDashBtn.addEventListener('click', () => showMainView('dashboard'));
        changePasswordForm.addEventListener('submit', handleChangePassword);
        
        [filterSubjectStud, filterStatusStud, filterSortStud].forEach(el => {
            el.addEventListener('change', renderFilteredQuizzesStud);
        });

        document.body.addEventListener('click', handleDynamicClicks);

        refreshAvailableQuizzes();
        refreshMyAttempts('attempts-list-container');
    }

    // --- NAVIGATION ---
    function logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }

    function showMainView(viewName) {
        dashboardView.style.display = (viewName === 'dashboard') ? 'block' : 'none';
        quizViewContainer.style.display = (viewName === 'quiz') ? 'block' : 'none';
        profileView.style.display = (viewName === 'profile') ? 'block' : 'none';
    }

    function switchDashboardTab(tabId) {
        dashboardTabContents.forEach(content => content.classList.remove('active'));
        dashboardTabs.forEach(tab => tab.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        document.querySelector(`#dashboard-view .tab-btn[data-tab="${tabId}"]`).classList.add('active');
    }
    
    function switchProfileTab(tabId) {
        profileTabContents.forEach(content => content.classList.remove('active'));
        profileTabs.forEach(tab => tab.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        document.querySelector(`.profile-tab-btn[data-tab="${tabId}"]`).classList.add('active');
    }
    
    function showQuizView(show) {
        if (show) {
            showMainView('quiz');
            // Ensure form is visible and result is hidden when starting
            quizAttemptForm.style.display = 'block';
            const existingResult = document.getElementById('quiz-result-card');
            if (existingResult) existingResult.remove();
        } else {
            showMainView('dashboard');
            switchDashboardTab('available-quizzes');
        }
    }

    // --- EVENT HANDLING ---
    function handleDynamicClicks(e) {
        const quizId = e.target.dataset.id;
        
        // Handle Back Button inside the result card
        if (e.target.id === 'result-back-btn') {
            showQuizView(false); // Go back to dashboard
            return;
        }

        if (!quizId) return;
        if (e.target.classList.contains('start-quiz-btn') || e.target.classList.contains('reattempt-quiz-btn')) {
            startQuiz(quizId);
        }
    }

    // --- DATA FETCHING ---
    function getMyAttempts() {
        return attempts.filter(a => a.student === currentUser.username);
    }
    
    function findMyLatestAttempt(quizId) {
        const myAttemptsForQuiz = getMyAttempts()
            .filter(a => a.quizId === quizId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        return myAttemptsForQuiz[0];
    }

    function refreshAvailableQuizzes() {
        availableListContainer.innerHTML = '';
        const availableQuizzes = [];
        const publishedQuizzes = quizzes.filter(q => q.published);

        publishedQuizzes.forEach(quiz => {
            const latestAttempt = findMyLatestAttempt(quiz.id);
            let isAvailable = false;
            let isUpdated = false;

            if (!latestAttempt) {
                isAvailable = true;
            } else {
                const quizVersion = quiz.lastUpdated || 0;
                const attemptedVersion = latestAttempt.quizVersion || 0;
                if (quizVersion > attemptedVersion) {
                    isAvailable = true;
                    isUpdated = true;
                }
            }

            if (isAvailable) {
                availableQuizzes.push({ ...quiz, isUpdated: isUpdated });
            }
        });

        if (availableQuizzes.length === 0) {
            availableListContainer.innerHTML = '<p>No new quizzes available at this time.</p>';
            return;
        }

        availableQuizzes.forEach(quiz => {
            const updatedTag = quiz.isUpdated 
                ? `<span class="status updated">Updated</span>` 
                : '';

            const quizHtml = `
                <div class="quiz-list-item">
                    <div class="quiz-info">
                        <h3>${quiz.title} ${updatedTag}</h3>
                        <p>Category: ${quiz.category} | By: ${quiz.createdBy} | Questions: ${quiz.questions.length}</p>
                    </div>
                    <div class="quiz-actions">
                        <button class="btn start-quiz-btn" data-id="${quiz.id}">
                            ${quiz.isUpdated ? 'Re-attempt (Updated)' : 'Start Quiz'}
                        </button>
                    </div>
                </div>
            `;
            availableListContainer.insertAdjacentHTML('beforeend', quizHtml);
        });
    }

    function refreshMyAttempts(targetElementId) {
        const container = document.getElementById(targetElementId);
        if (!container) return;
        container.innerHTML = '';
        const myAttempts = getMyAttempts();

        if (myAttempts.length === 0) {
            container.innerHTML = '<p>You have not completed any quizzes yet.</p>';
            return;
        }

        myAttempts.forEach(attempt => {
            const quiz = quizzes.find(q => q.id === attempt.quizId);
            if (!quiz) return;

            const quizHtml = `
                <div class="quiz-list-item">
                    <div class="quiz-info">
                        <h3>${quiz.title}</h3>
                        <p>Category: ${quiz.category} | By: ${quiz.createdBy}</p>
                        <p style="font-weight: bold; color: var(--primary-color);">
                            Your Score: ${attempt.score} / ${attempt.total}
                        </p>
                        <p style="font-size: 12px; color: #777;">
                            Attempted on: ${new Date(attempt.date).toLocaleString()}
                        </p>
                    </div>
                    <div class="quiz-actions">
                        <button class="btn btn-secondary reattempt-quiz-btn" data-id="${quiz.id}">Re-attempt</button>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', quizHtml);
        });
    }
    
    // --- TAKING QUIZ ---
    function startQuiz(quizId) {
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) {
            alert('Error: Quiz not found.');
            return;
        }
        
        currentQuizId = quiz.id;
        currentQuizVersion = quiz.lastUpdated || 0;
        
        quizViewTitle.textContent = quiz.title;
        quizViewDescription.textContent = quiz.description;
        quizQuestionsArea.innerHTML = ''; 
        quiz.questions.forEach((q, qIndex) => {
            const questionHtml = `
                <div class="quiz-question-item">
                    <p>${qIndex + 1}. ${q.text} <span class="question-type-hint">(${q.type === 'single' ? 'Single' : 'Multi'} Correct)</span></p>
                    <div class="quiz-options-container">
                        ${q.options.map((opt, oIndex) => `
                            <div class="quiz-option">
                                <input type="${q.type === 'single' ? 'radio' : 'checkbox'}" 
                                       name="question-${qIndex}" id="q-${qIndex}-opt-${oIndex}" value="${oIndex}">
                                <label for="q-${qIndex}-opt-${oIndex}">${opt}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            quizQuestionsArea.insertAdjacentHTML('beforeend', questionHtml);
        });
        showQuizView(true);
    }

    // --- SUBMIT LOGIC (UPDATED) ---
    function submitQuiz(e) {
        e.preventDefault();
        if (!currentQuizId) return;
        const quiz = quizzes.find(q => q.id === currentQuizId);
        if (!quiz) return;

        let score = 0;
        const total = quiz.questions.length;
        let totalCorrect = 0;

        quiz.questions.forEach((q, qIndex) => {
            const selectedOptions = [];
            const inputs = document.querySelectorAll(`input[name="question-${qIndex}"]:checked`);
            inputs.forEach(input => selectedOptions.push(parseInt(input.value)));
            const correctAnswers = q.correct.sort().toString();
            const userAnswers = selectedOptions.sort().toString();
            if (correctAnswers === userAnswers) {
                score++;
                totalCorrect += q.correct.length;
            }
        });

        // Save Attempt
        const newAttempt = {
            student: currentUser.username,
            quizId: currentQuizId,
            quizVersion: currentQuizVersion,
            score: score,
            total: total,
            totalCorrectAnswers: totalCorrect,
            totalQuestionsInAttempt: quiz.questions.reduce((sum, q) => sum + q.correct.length, 0),
            date: new Date().toISOString()
        };
        
        attempts.push(newAttempt);
        localStorage.setItem('studentAttempts', JSON.stringify(attempts));
        
        // Reset Logic
        currentQuizId = null;
        currentQuizVersion = null;
        quizAttemptForm.reset();
        refreshAvailableQuizzes();
        refreshMyAttempts('attempts-list-container');
        
        // --- CHANGED: Show result on page instead of Alert ---
        showQuizResult(score, total);
    }

    // --- NEW: Helper to display result on screen ---
    function showQuizResult(score, total) {
        // 1. Hide the quiz form
        quizAttemptForm.style.display = 'none';

        // 2. Create result HTML
        const percentage = ((score / total) * 100).toFixed(1);
        let message = "Good effort!";
        if (percentage >= 80) message = "Excellent work!";
        else if (percentage < 50) message = "Keep practicing!";

        const resultHtml = `
            <div id="quiz-result-card" class="result-card">
                <h2>Quiz Completed!</h2>
                <p class="lead">${message}</p>
                
                <div class="result-score">
                    ${score} <span class="result-total">/ ${total}</span>
                </div>
                
                <p>Percentage: <strong>${percentage}%</strong></p>
                <button class="btn" id="result-back-btn" style="margin-top: 2rem;">Back to Dashboard</button>
            </div>
        `;

        // 3. Inject into the container
        quizViewContainer.insertAdjacentHTML('beforeend', resultHtml);
        
        // Note: The click listener for "result-back-btn" is handled in handleDynamicClicks
    }

    // --- PROFILE FUNCTIONS ---
    function loadProfileData() {
        document.getElementById('p-info-username').textContent = currentUser.username;
        refreshMyAttempts('p-history-list-container');
        loadSimpleStatistics();
        loadPerformanceData();
        renderFilteredQuizzesStud();
    }

    function loadSimpleStatistics() {
        const container = document.getElementById('p-stats-container');
        const myAttempts = getMyAttempts();

        const totalAttempts = myAttempts.length;
        const totalScore = myAttempts.reduce((sum, a) => sum + a.score, 0);
        const totalPossible = myAttempts.reduce((sum, a) => sum + a.total, 0);
        const avgScore = (totalPossible > 0) ? ((totalScore / totalPossible) * 100).toFixed(1) : 0;
        
        container.innerHTML = `
            <div class="stat-card"><h4>Quizzes Completed</h4><p>${totalAttempts}</p></div>
            <div class="stat-card"><h4>Average Score</h4><p>${avgScore}%</p></div>
            <div class="stat-card"><h4>Total Questions Answered</h4><p>${totalPossible}</p></div>
        `;
    }

    function loadPerformanceData() {
        const container = document.getElementById('p-performance-container');
        const myAttempts = getMyAttempts();

        if (myAttempts.length === 0) {
            container.innerHTML = "<p>No performance data yet. Complete some quizzes!</p>";
            return;
        }

        const totalCorrect = myAttempts.reduce((sum, a) => sum + a.score, 0);
        const totalQuestions = myAttempts.reduce((sum, a) => sum + a.total, 0);
        const overallAccuracy = (totalQuestions > 0) ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : 0;

        const scores = myAttempts.map(a => (a.total > 0) ? (a.score / a.total) * 100 : 0);
        const bestScore = Math.max(...scores).toFixed(1);
        const worstScore = Math.min(...scores).toFixed(1);

        const categories = {};
        myAttempts.forEach(attempt => {
            const quiz = quizzes.find(q => q.id === attempt.quizId);
            if (!quiz) return;
            const category = quiz.category;
            if (!categories[category]) categories[category] = { score: 0, total: 0, count: 0 };
            categories[category].score += attempt.score;
            categories[category].total += attempt.total;
            categories[category].count++;
        });

        let categoryHtml = '<div class="stats-container">';
        for (const [name, data] of Object.entries(categories)) {
            const catAvg = (data.total > 0) ? ((data.score / data.total) * 100).toFixed(1) : 0;
            categoryHtml += `
                <div class="stat-card">
                    <h4>${name}</h4>
                    <p>${catAvg}%</p>
                    <small>(${data.count} attempt${data.count > 1 ? 's' : ''})</small>
                </div>`;
        }
        categoryHtml += '</div>';

        container.innerHTML = `
            <div class="perf-category">
                <h4>Overall</h4>
                <div class="stats-container">
                    <div class="stat-card"><h4>Overall Accuracy</h4><p>${overallAccuracy}%</p></div>
                    <div class="stat-card"><h4>Best Quiz Score</h4><p>${bestScore}%</p></div>
                    <div class="stat-card"><h4>Worst Quiz Score</h4><p>${worstScore}%</p></div>
                </div>
            </div>
            <div class="perf-category">
                <h4>Performance by Category</h4>
                ${categoryHtml}
            </div>
        `;
    }

    function renderFilteredQuizzesStud() {
        let allPublishedQuizzes = quizzes.filter(q => q.published);
        const myAttemptIds = getMyAttempts().map(a => a.quizId);
        const subject = filterSubjectStud.value;
        const status = filterStatusStud.value;
        const sort = filterSortStud.value;

        if (subject !== 'all') allPublishedQuizzes = allPublishedQuizzes.filter(q => q.category === subject);
        if (status !== 'all') {
            if (status === 'attempted') allPublishedQuizzes = allPublishedQuizzes.filter(q => myAttemptIds.includes(q.id));
            else allPublishedQuizzes = allPublishedQuizzes.filter(q => !myAttemptIds.includes(q.id));
        }

        allPublishedQuizzes.sort((a, b) => {
            if (sort === 'title') return a.title.localeCompare(b.title);
            if (sort === 'category') return a.category.localeCompare(b.category);
            return 0;
        });

        pFilteredListContainerStud.innerHTML = '';
        if (allPublishedQuizzes.length === 0) {
            pFilteredListContainerStud.innerHTML = '<p>No quizzes match your filters.</p>';
            return;
        }
        allPublishedQuizzes.forEach(quiz => {
            const hasAttempted = myAttemptIds.includes(quiz.id);
            const statusTag = hasAttempted
                ? `<span class="status published" style="background: var(--primary-color);">Attempted</span>`
                : `<span class="status draft">Not Attempted</span>`;

            pFilteredListContainerStud.innerHTML += `
                <div class="quiz-list-item">
                    <div class="quiz-info">
                        <h3>${quiz.title}</h3>
                        <p>Category: ${quiz.category} | By: ${quiz.createdBy}</p>
                        ${statusTag}
                    </div>
                </div>
            `;
        });
    }

    function handleChangePassword(e) {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
        let allUsers = JSON.parse(localStorage.getItem('users'));
        let userIndex = allUsers.findIndex(u => u.username === currentUser.username);
        if (userIndex > -1) {
            allUsers[userIndex].password = newPassword;
            localStorage.setItem('users', JSON.stringify(allUsers));
            currentUser.password = newPassword;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            alert('Password updated successfully!');
            changePasswordForm.reset();
        } else {
            alert('Error: Could not find user.');
        }
    }

    init();
});