document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION & INITIALIZATION ---

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // Auth Check
    if (!currentUser || currentUser.role !== 'student') {
        alert('Access Denied. Please log in as a student.');
        window.location.href = 'index.html';
        return;
    }

    // --- GLOBAL VARIABLES ---
    let quizzes = JSON.parse(localStorage.getItem('quizzes')) || [];
    let attempts = JSON.parse(localStorage.getItem('studentAttempts')) || [];
    let currentQuizId = null; // To track which quiz is being attempted

    // --- DOM ELEMENTS ---
    const navAuthContainer = document.getElementById('nav-auth-container');
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Dashboard View
    const dashboardView = document.getElementById('dashboard-view');
    const availableListContainer = document.getElementById('available-list-container');
    const attemptsListContainer = document.getElementById('attempts-list-container');

    // Quiz View
    const quizViewContainer = document.getElementById('quiz-view-container');
    const quizViewTitle = document.getElementById('quiz-view-title');
    const quizViewDescription = document.getElementById('quiz-view-description');
    const quizQuestionsArea = document.getElementById('quiz-questions-area');
    const quizAttemptForm = document.getElementById('quiz-attempt-form');


    // --- INITIALIZE PAGE ---
    function init() {
        // Setup Navbar
        navAuthContainer.innerHTML = `
            <span>Welcome, ${currentUser.username}</span>
            <button id="logout-btn" class="btn btn-secondary" style="width: auto; padding: 8px 12px;">Logout</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', logout);

        // Setup Tab Listeners
        tabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Setup Form Listener
        quizAttemptForm.addEventListener('submit', submitQuiz);

        // Event delegation for starting/reattempting quizzes
        document.body.addEventListener('click', handleDynamicClicks);

        // Load initial data
        refreshAvailableQuizzes();
        refreshMyAttempts();
    }

    // --- NAVIGATION & TABS ---

    function logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }

    function switchTab(tabId) {
        // Hide all content
        tabContents.forEach(content => content.classList.remove('active'));
        // Deactivate all tabs
        tabs.forEach(tab => tab.classList.remove('active'));

        // Show selected content and activate tab
        document.getElementById(tabId).classList.add('active');
        document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    }
    
    function showQuizView(show) {
        if (show) {
            dashboardView.style.display = 'none';
            quizViewContainer.style.display = 'block';
            quizViewContainer.classList.add('active'); // Use active class styling
        } else {
            dashboardView.style.display = 'block';
            quizViewContainer.style.display = 'none';
            quizViewContainer.classList.remove('active');
            switchTab('available-quizzes'); // Default back to available
        }
    }

    // --- DYNAMIC CLICK HANDLER (Event Delegation) ---
    
    function handleDynamicClicks(e) {
        const quizId = e.target.dataset.id;
        if (!quizId) return;

        // Start Quiz or Re-attempt
        if (e.target.classList.contains('start-quiz-btn') || e.target.classList.contains('reattempt-quiz-btn')) {
            startQuiz(quizId);
        }
    }

    // --- QUIZ LISTS (Dashboard View) ---

    function refreshAvailableQuizzes() {
        availableListContainer.innerHTML = '';
        
        // Get quizzes that are published AND the student has not attempted
        const myAttemptedQuizIds = attempts
            .filter(a => a.student === currentUser.username)
            .map(a => a.quizId);
            
        const availableQuizzes = quizzes.filter(
            q => q.published && !myAttemptedQuizIds.includes(q.id)
        );

        if (availableQuizzes.length === 0) {
            availableListContainer.innerHTML = '<p>No new quizzes available at this time.</p>';
            return;
        }

        availableQuizzes.forEach(quiz => {
            const quizHtml = `
                <div class="quiz-list-item">
                    <div class="quiz-info">
                        <h3>${quiz.title}</h3>
                        <p>Category: ${quiz.category} | By: ${quiz.createdBy} | Questions: ${quiz.questions.length}</p>
                    </div>
                    <div class="quiz-actions">
                        <button class="btn start-quiz-btn" data-id="${quiz.id}">Start Quiz</button>
                    </div>
                </div>
            `;
            availableListContainer.insertAdjacentHTML('beforeend', quizHtml);
        });
    }

    function refreshMyAttempts() {
        attemptsListContainer.innerHTML = '';
        
        const myAttempts = attempts.filter(a => a.student === currentUser.username);

        if (myAttempts.length === 0) {
            attemptsListContainer.innerHTML = '<p>You have not completed any quizzes yet.</p>';
            return;
        }

        myAttempts.forEach(attempt => {
            // Find the quiz details to get the title
            const quiz = quizzes.find(q => q.id === attempt.quizId);
            if (!quiz) return; // Quiz might have been deleted

            const quizHtml = `
                <div class="quiz-list-item">
                    <div class="quiz-info">
                        <h3>${quiz.title}</h3>
                        <p>Category: ${quiz.category} | By: ${quiz.createdBy}</p>
                        <p style="font-weight: bold; color: var(--primary-color);">
                            Your Score: ${attempt.score} / ${attempt.total}
                        </p>
                    </div>
                    <div class="quiz-actions">
                        <button class="btn btn-secondary reattempt-quiz-btn" data-id="${quiz.id}">Re-attempt</button>
                    </div>
                </div>
            `;
            attemptsListContainer.insertAdjacentHTML('beforeend', quizHtml);
        });
    }
    
    // --- TAKING A QUIZ (Quiz View) ---

    function startQuiz(quizId) {
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) {
            alert('Error: Quiz not found.');
            return;
        }

        currentQuizId = quiz.id; // Set the active quiz
        
        // Populate quiz info
        quizViewTitle.textContent = quiz.title;
        quizViewDescription.textContent = quiz.description;
        quizQuestionsArea.innerHTML = ''; // Clear previous questions

        // Render questions
        quiz.questions.forEach((q, qIndex) => {
            const questionHtml = `
                <div class="quiz-question-item">
                    <p>
                        ${qIndex + 1}. ${q.text}
                        <span class="question-type-hint">(${q.type === 'single' ? 'Single Correct' : 'Multiple Correct'})</span>
                    </p>
                    <div class="quiz-options-container">
                        ${q.options.map((opt, oIndex) => `
                            <div class="quiz-option">
                                <input type="${q.type === 'single' ? 'radio' : 'checkbox'}" 
                                       name="question-${qIndex}" 
                                       id="q-${qIndex}-opt-${oIndex}" 
                                       value="${oIndex}">
                                <label for="q-${qIndex}-opt-${oIndex}">${opt}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            quizQuestionsArea.insertAdjacentHTML('beforeend', questionHtml);
        });
        
        // Show the quiz view
        showQuizView(true);
    }

    function submitQuiz(e) {
        e.preventDefault();
        if (!currentQuizId) return;
        
        const quiz = quizzes.find(q => q.id === currentQuizId);
        if (!quiz) return;

        let score = 0;
        const total = quiz.questions.length;

        quiz.questions.forEach((q, qIndex) => {
            const selectedOptions = [];
            // Find all checked inputs for this question
            const inputs = document.querySelectorAll(`input[name="question-${qIndex}"]:checked`);
            inputs.forEach(input => {
                selectedOptions.push(parseInt(input.value)); // value is the 0-index
            });
            
            // Check if the selected answers are correct
            // Convert both arrays to strings for easy comparison
            const correctAnswers = q.correct.sort().toString();
            const userAnswers = selectedOptions.sort().toString();

            if (correctAnswers === userAnswers) {
                score++;
            }
        });

        // Save the attempt
        const newAttempt = {
            student: currentUser.username,
            quizId: currentQuizId,
            score: score,
            total: total,
            date: new Date().toISOString()
        };
        
        // Check if user already attempted this quiz and update it
        const existingAttemptIndex = attempts.findIndex(
            a => a.student === currentUser.username && a.quizId === currentQuizId
        );
        
        if (existingAttemptIndex > -1) {
            attempts[existingAttemptIndex] = newAttempt; // Update score on re-attempt
        } else {
            attempts.push(newAttempt);
        }

        localStorage.setItem('studentAttempts', JSON.stringify(attempts));

        // Show result
        alert(`Quiz Submitted!\nYour Score: ${score} / ${total}`);
        
        // Reset and go back to dashboard
        currentQuizId = null;
        quizAttemptForm.reset();
        refreshAvailableQuizzes();
        refreshMyAttempts();
        showQuizView(false);
    }

    // --- START THE APPLICATION ---
    init();
});