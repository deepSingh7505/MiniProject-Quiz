document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION & INITIALIZATION ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'teacher') {
        alert('Access Denied. Please log in as a teacher.');
        window.location.href = 'index.html';
        return;
    }

    // --- GLOBAL VARIABLES ---
    let quizzes = JSON.parse(localStorage.getItem('quizzes')) || [];
    let questionCounter = 0;

    // --- DOM ELEMENTS ---
    const navAuthContainer = document.getElementById('nav-auth-container');
    const dashboardView = document.getElementById('dashboard-view');
    const profileView = document.getElementById('profile-view');
    
    // Dashboard Tabs
    const dashboardTabs = document.querySelectorAll('.dashboard-tab-btn');
    const dashboardTabContents = document.querySelectorAll('.dashboard-tab-content');
    
    // Profile View
    const backToDashBtn = document.getElementById('back-to-dash-btn');
    const profileTabs = document.querySelectorAll('.profile-tab-btn');
    const profileTabContents = document.querySelectorAll('.profile-tab-content');
    const changePasswordForm = document.getElementById('change-password-form');
    
    // Create Quiz Form
    const createQuizForm = document.getElementById('create-quiz-form');
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const saveQuizBtn = document.getElementById('save-quiz-btn');
    const quizEditIdField = document.getElementById('quiz-edit-id');

    // Take/Preview Quiz
    const quizPreviewArea = document.getElementById('quiz-preview-area');

    // Profile Filter Elements
    const filterSubject = document.getElementById('filter-subject');
    const filterStatus = document.getElementById('filter-status');
    const filterSort = document.getElementById('filter-sort');
    const pFilteredListContainer = document.getElementById('p-filtered-list-container');


    // --- INITIALIZE PAGE ---
    function init() {
        // Setup Navbar
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

        // Setup Listeners
        dashboardTabs.forEach(tab => tab.addEventListener('click', () => switchDashboardTab(tab.dataset.tab)));
        profileTabs.forEach(tab => tab.addEventListener('click', () => switchProfileTab(tab.dataset.tab)));
        addQuestionBtn.addEventListener('click', addQuestion);
        createQuizForm.addEventListener('submit', saveQuiz);
        backToDashBtn.addEventListener('click', () => showMainView('dashboard'));
        changePasswordForm.addEventListener('submit', handleChangePassword);
        
        // Filter Listeners
        [filterSubject, filterStatus, filterSort].forEach(el => {
            el.addEventListener('change', renderFilteredQuizzes);
        });

        // Event delegation
        document.body.addEventListener('click', handleDynamicClicks);

        // Load initial data
        refreshQuizLibrary('library-list-container');
        refreshPreviewList('preview-list-container');
        addQuestion();
    }

    // --- NAVIGATION & VIEW MANAGEMENT ---
    function logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
    
    function showMainView(viewName) {
        dashboardView.style.display = (viewName === 'dashboard') ? 'block' : 'none';
        profileView.style.display = (viewName === 'profile') ? 'block' : 'none';
    }

    function switchDashboardTab(tabId) {
        dashboardTabContents.forEach(content => content.classList.remove('active'));
        dashboardTabs.forEach(tab => tab.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        document.querySelector(`.dashboard-tab-btn[data-tab="${tabId}"]`).classList.add('active');
    }
    
    function switchProfileTab(tabId) {
        profileTabContents.forEach(content => content.classList.remove('active'));
        profileTabs.forEach(tab => tab.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        document.querySelector(`.profile-tab-btn[data-tab="${tabId}"]`).classList.add('active');
    }
    
    // --- DYNAMIC CLICK HANDLER ---
    function handleDynamicClicks(e) {
        if (e.target.classList.contains('remove-question-btn')) {
            e.target.closest('.question-card').remove();
        }
        
        const quizId = e.target.dataset.id;
        if (!quizId) return;

        if (e.target.classList.contains('publish-btn')) togglePublish(quizId);
        if (e.target.classList.contains('edit-btn')) loadQuizForEdit(quizId);
        if (e.target.classList.contains('delete-btn')) deleteQuiz(quizId);
        if (e.target.classList.contains('preview-btn')) loadQuizForPreview(quizId);
        
        // --- NEW REPUBLISH ACTION ---
        if (e.target.classList.contains('republish-btn')) {
            republishQuiz(quizId);
        }
    }

    // --- QUIZ CREATION ---
    function addQuestion() {
        questionCounter++;
        // (Function content is unchanged)
        const questionHtml = `
            <div class="question-card" data-q-index="${questionCounter}">
                <div class="question-card-header">
                    <h3>Question ${questionCounter}</h3>
                    <button type="button" class="btn btn-danger btn-small remove-question-btn" style="width:auto; padding: 5px 10px;">Remove</button>
                </div>
                <div class="form-group">
                    <label for="q-text-${questionCounter}">Question Text</label>
                    <input type="text" id="q-text-${questionCounter}" class="q-text" required>
                </div>
                <div class="form-group question-type-select">
                    <label>Question Type:</label>
                    <select class="q-type" data-q-index="${questionCounter}">
                        <option value="single">Single Correct</option>
                        <option value="multi">Multiple Correct</option>
                    </select>
                </div>
                <div class="question-options">
                    ${[1, 2, 3, 4].map(i => `
                        <div class="form-group">
                            <label for="q-${questionCounter}-opt-${i}">Option ${i}</label>
                            <input type="text" id="q-${questionCounter}-opt-${i}" class="q-option" required>
                        </div>
                    `).join('')}
                </div>
                <label class="correct-answer-label">Correct Answer(s):</label>
                <div class="options-grid" id="q-correct-options-${questionCounter}">
                    ${[1, 2, 3, 4].map(i => `
                        <input type="checkbox" id="q-${questionCounter}-correct-${i}" class="q-correct" value="${i-1}">
                        <label for="q-${questionCounter}-correct-${i}">Option ${i}</label>
                    `).join('')}
                </div>
            </div>
        `;
        questionsContainer.insertAdjacentHTML('beforeend', questionHtml);
    }
    
    document.body.addEventListener('change', e => {
        if (e.target.classList.contains('q-type')) {
            // (Function content is unchanged)
            const index = e.target.dataset.qIndex;
            const optionsContainer = document.getElementById(`q-correct-options-${index}`);
            const checkboxes = optionsContainer.querySelectorAll('input');
            if (e.target.value === 'single') {
                checkboxes.forEach(cb => { cb.type = 'radio'; cb.name = `q-${index}-correct-group`; });
            } else {
                checkboxes.forEach(rb => { rb.type = 'checkbox'; rb.name = ''; });
            }
        }
    });

    // --- MODIFIED saveQuiz ---
    function saveQuiz(e) {
        e.preventDefault();
        
        const quizId = quizEditIdField.value;
        const newQuiz = {
            id: quizId || `q_${new Date().getTime()}`,
            title: document.getElementById('quiz-title').value,
            description: document.getElementById('quiz-description').value,
            category: document.getElementById('quiz-category').value,
            createdBy: currentUser.username,
            published: false, // Default to draft, will be preserved if editing
            questions: [],
            lastUpdated: new Date().toISOString() // --- NEW: Add/Update timestamp ---
        };

        const questionCards = questionsContainer.querySelectorAll('.question-card');
        // (Form validation is unchanged)
        if (questionCards.length === 0) {
            alert('Please add at least one question.');
            return;
        }
        let formIsValid = true;
        questionCards.forEach(card => {
            const text = card.querySelector('.q-text').value;
            const type = card.querySelector('.q-type').value;
            const options = Array.from(card.querySelectorAll('.q-option')).map(opt => opt.value);
            const correct = Array.from(card.querySelectorAll('.q-correct:checked')).map(opt => parseInt(opt.value));
            if (!text || options.includes('') || correct.length === 0) formIsValid = false;
            newQuiz.questions.push({ text, type, options, correct });
        });
        if (!formIsValid) {
            alert('Please fill out all fields and select correct answers.');
            return;
        }
        // (End of form validation)

        if (quizId) {
            const indexToUpdate = quizzes.findIndex(q => q.id === quizId);
            newQuiz.published = quizzes[indexToUpdate].published; // Preserve status
            quizzes[indexToUpdate] = newQuiz;
        } else {
            quizzes.push(newQuiz);
        }

        localStorage.setItem('quizzes', JSON.stringify(quizzes));
        alert(quizId ? 'Quiz updated successfully! Students will see the update.' : 'Quiz saved successfully!');
        
        resetCreateForm();
        refreshQuizLibrary('library-list-container');
        refreshPreviewList('preview-list-container');
        switchDashboardTab('quiz-library');
    }

    function resetCreateForm() {
        // (Function content is unchanged)
        createQuizForm.reset();
        questionsContainer.innerHTML = '';
        quizEditIdField.value = '';
        saveQuizBtn.textContent = 'Save Quiz';
        questionCounter = 0;
        addQuestion();
    }


    // --- QUIZ LIBRARY (Refactored) ---
    function getMyQuizzes() {
        return quizzes.filter(q => q.createdBy === currentUser.username);
    }

    // --- MODIFIED refreshQuizLibrary ---
    function refreshQuizLibrary(targetElementId) {
        const container = document.getElementById(targetElementId);
        if (!container) return;
        container.innerHTML = '';
        const myQuizzes = getMyQuizzes();

        if (myQuizzes.length === 0) {
            container.innerHTML = '<p>You have not created any quizzes yet.</p>';
            return;
        }

        myQuizzes.forEach(quiz => {
            // --- NEW: Add Republish button if already published ---
            const republishBtn = quiz.published 
                ? `<button class="btn btn-warning republish-btn" data-id="${quiz.id}">Republish</button>` 
                : '';

            const quizHtml = `
                <div class="quiz-list-item">
                    <div class="quiz-info">
                        <h3>${quiz.title}</h3>
                        <p>Category: ${quiz.category} | Questions: ${quiz.questions.length}</p>
                        <span class="status ${quiz.published ? 'published' : 'draft'}">
                            ${quiz.published ? 'Published' : 'Draft'}
                        </span>
                    </div>
                    <div class="quiz-actions">
                        ${republishBtn} <button class="btn btn-secondary publish-btn" data-id="${quiz.id}">
                            ${quiz.published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button class="btn edit-btn" data-id="${quiz.id}">Edit</button>
                        <button class="btn btn-danger delete-btn" data-id="${quiz.id}">Delete</button>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', quizHtml);
        });
    }

    function togglePublish(quizId) {
        const quiz = quizzes.find(q => q.id === quizId);
        if (quiz) {
            quiz.published = !quiz.published;
            quiz.lastUpdated = new Date().toISOString(); // --- NEW: Update timestamp on publish/unpublish
            localStorage.setItem('quizzes', JSON.stringify(quizzes));
            refreshQuizLibrary('library-list-container');
            refreshPreviewList('preview-list-container');
        }
    }

    // --- NEW: republishQuiz function ---
    function republishQuiz(quizId) {
        if (!confirm('This will notify students that the quiz is new/updated, even if no changes were made. Are you sure?')) {
            return;
        }
        const quiz = quizzes.find(q => q.id === quizId);
        if (quiz) {
            quiz.lastUpdated = new Date().toISOString(); // Just update the timestamp
            localStorage.setItem('quizzes', JSON.stringify(quizzes));
            refreshQuizLibrary('library-list-container');
            alert('Quiz has been republished!');
        }
    }
    
    function deleteQuiz(quizId) {
        if (confirm('Are you sure you want to delete this quiz? This cannot be undone.')) {
            quizzes = quizzes.filter(q => q.id !== quizId);
            localStorage.setItem('quizzes', JSON.stringify(quizzes));
            refreshQuizLibrary('library-list-container');
            refreshPreviewList('preview-list-container');
        }
    }

    function loadQuizForEdit(quizId) {
        // (Function content is unchanged, but 'saveQuiz' will now update timestamp)
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) return;
        showMainView('dashboard');
        switchDashboardTab('create-quiz');
        createQuizForm.reset();
        questionsContainer.innerHTML = '';
        questionCounter = 0;
        quizEditIdField.value = quiz.id;
        document.getElementById('quiz-title').value = quiz.title;
        document.getElementById('quiz-description').value = quiz.description;
        document.getElementById('quiz-category').value = quiz.category;
        saveQuizBtn.textContent = 'Update Quiz';
        quiz.questions.forEach(q => {
            addQuestion();
            document.getElementById(`q-text-${questionCounter}`).value = q.text;
            const typeSelect = document.querySelector(`.q-type[data-q-index="${questionCounter}"]`);
            typeSelect.value = q.type;
            q.options.forEach((opt, i) => {
                document.getElementById(`q-${questionCounter}-opt-${i+1}`).value = opt;
            });
            typeSelect.dispatchEvent(new Event('change'));
            q.correct.forEach(correctIndex => {
                document.getElementById(`q-correct-options-${questionCounter}`).querySelector(`input[value="${correctIndex}"]`).checked = true;
            });
        });
    }

    // --- TAKE QUIZ / PREVIEW (Refactored) ---
    function refreshPreviewList(targetElementId) {
        // (Function content is unchanged)
        const container = document.getElementById(targetElementId);
        if (!container) return;
        container.innerHTML = '';
        const myQuizzes = getMyQuizzes();
        if (myQuizzes.length === 0) {
            container.innerHTML = '<p>Create a quiz to preview it.</p>';
            return;
        }
        myQuizzes.forEach(quiz => {
            const quizHtml = `
                <div class="quiz-list-item">
                    <div class="quiz-info">
                        <h3>${quiz.title}</h3> <p>Category: ${quiz.category}</p>
                    </div>
                    <div class="quiz-actions">
                        <button class="btn preview-btn" data-id="${quiz.id}">Preview</button>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', quizHtml);
        });
    }
    function loadQuizForPreview(quizId) {
        // (Function content is unchanged)
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) return;
        quizPreviewArea.innerHTML = `<h2>Preview: ${quiz.title}</h2>`;
        quiz.questions.forEach((q, qIndex) => {
            quizPreviewArea.innerHTML += `
                <div class="quiz-question-item">
                    <p>${qIndex + 1}. ${q.text} <span class="question-type-hint">(${q.type === 'single' ? 'Single' : 'Multi'} Correct)</span></p>
                    <div class="quiz-options-container">
                        ${q.options.map((opt, oIndex) => `
                            <div class="quiz-option">
                                <input type="${q.type === 'single' ? 'radio' : 'checkbox'}" name="q-preview-${qIndex}" id="q-preview-${qIndex}-opt-${oIndex}" 
                                       ${q.correct.includes(oIndex) ? 'checked' : ''} disabled>
                                <label for="q-preview-${qIndex}-opt-${oIndex}" style="${q.correct.includes(oIndex) ? 'font-weight:bold; color:green;' : ''}">
                                    ${opt}
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        quizPreviewArea.insertAdjacentHTML('beforeend', '<p><i>Preview mode: Correct answers are shown.</i></p>');
    }
    
    // --- NEW PROFILE FUNCTIONS ---

    function loadProfileData() {
        // Tab: Profile
        document.getElementById('p-info-username').textContent = currentUser.username;
        // Tab: My Quizzes
        refreshQuizLibrary('p-quizzes-list-container'); // Use simplified list for profile
        // Tab: Statistics
        loadStatistics();
        // Tab: Filter
        renderFilteredQuizzes();
    }

    function loadStatistics() {
        // (Function content is unchanged)
        const container = document.getElementById('p-stats-container');
        const myQuizzes = getMyQuizzes();
        const totalQuizzes = myQuizzes.length;
        const totalPublished = myQuizzes.filter(q => q.published).length;
        const totalQuestions = myQuizzes.reduce((sum, q) => sum + q.questions.length, 0);
        container.innerHTML = `
            <div class="stats-container">
                <div class="stat-card"><h4>Total Quizzes Created</h4><p>${totalQuizzes}</p></div>
                <div class="stat-card"><h4>Quizzes Published</h4><p>${totalPublished}</p></div>
                <div class="stat-card"><h4>Total Questions</h4><p>${totalQuestions}</p></div>
            </div>
        `;
    }

    // --- NEW: Filter Tab Function ---
    function renderFilteredQuizzes() {
        let myQuizzes = getMyQuizzes();

        // 1. Filter by Subject
        const subject = filterSubject.value;
        if (subject !== 'all') {
            myQuizzes = myQuizzes.filter(q => q.category === subject);
        }

        // 2. Filter by Status
        const status = filterStatus.value;
        if (status !== 'all') {
            const isPublished = (status === 'published');
            myQuizzes = myQuizzes.filter(q => q.published === isPublished);
        }

        // 3. Sort by Date
        const sort = filterSort.value;
        myQuizzes.sort((a, b) => {
            const dateA = new Date(a.lastUpdated || 0);
            const dateB = new Date(b.lastUpdated || 0);
            return (sort === 'newest') ? (dateB - dateA) : (dateA - dateB);
        });

        // 4. Render
        pFilteredListContainer.innerHTML = '';
        if (myQuizzes.length === 0) {
            pFilteredListContainer.innerHTML = '<p>No quizzes match your filters.</p>';
            return;
        }
        myQuizzes.forEach(quiz => {
            pFilteredListContainer.innerHTML += `
                <div class="quiz-list-item">
                    <div class="quiz-info">
                        <h3>${quiz.title}</h3>
                        <p>Category: ${quiz.category} | Last Updated: ${new Date(quiz.lastUpdated).toLocaleDateString()}</p>
                        <span class="status ${quiz.published ? 'published' : 'draft'}">
                            ${quiz.published ? 'Published' : 'Draft'}
                        </span>
                    </div>
                </div>
            `;
        });
    }


    function handleChangePassword(e) {
        // (Function content is unchanged)
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

    // --- START THE APPLICATION ---
    init();
});