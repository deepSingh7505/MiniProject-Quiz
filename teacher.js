document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION & INITIALIZATION ---

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // Auth Check
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
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Create Quiz Form
    const createQuizForm = document.getElementById('create-quiz-form');
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const saveQuizBtn = document.getElementById('save-quiz-btn');
    const quizEditIdField = document.getElementById('quiz-edit-id');

    // Library
    const libraryContainer = document.getElementById('library-list-container');
    
    // Take/Preview Quiz
    const previewListContainer = document.getElementById('preview-list-container');
    const quizPreviewArea = document.getElementById('quiz-preview-area');


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

        // Setup Form Listeners
        addQuestionBtn.addEventListener('click', addQuestion);
        createQuizForm.addEventListener('submit', saveQuiz);

        // Event delegation for dynamic buttons (remove question, library actions)
        document.body.addEventListener('click', handleDynamicClicks);

        // Load initial data
        refreshQuizLibrary();
        refreshPreviewList();
        addQuestion(); // Add the first question to the form
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
    
    // --- DYNAMIC CLICK HANDLER (Event Delegation) ---
    
    function handleDynamicClicks(e) {
        // Remove Question button
        if (e.target.classList.contains('remove-question-btn')) {
            e.target.closest('.question-card').remove();
        }
        
        // --- Library Actions ---
        const quizId = e.target.dataset.id;
        if (!quizId) return;

        // Publish/Unpublish
        if (e.target.classList.contains('publish-btn')) {
            togglePublish(quizId);
        }
        // Edit
        if (e.target.classList.contains('edit-btn')) {
            loadQuizForEdit(quizId);
        }
        // Delete
        if (e.target.classList.contains('delete-btn')) {
            deleteQuiz(quizId);
        }
        // Preview (from "Take Quiz" tab)
        if (e.target.classList.contains('preview-btn')) {
            loadQuizForPreview(quizId);
        }
    }

    // --- QUIZ CREATION (Section 1) ---

    function addQuestion() {
        questionCounter++;
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
    
    // Handle changing between single/multi correct
    document.body.addEventListener('change', e => {
        if (e.target.classList.contains('q-type')) {
            const index = e.target.dataset.qIndex;
            const optionsContainer = document.getElementById(`q-correct-options-${index}`);
            const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
            
            if (e.target.value === 'single') {
                // Change checkboxes to radio buttons
                checkboxes.forEach(cb => cb.type = 'radio');
                checkboxes.forEach(cb => cb.name = `q-${index}-correct-group`);
            } else {
                // Change radio buttons back to checkboxes
                checkboxes.forEach(rb => rb.type = 'checkbox');
                checkboxes.forEach(rb => rb.name = '');
            }
        }
    });


    function saveQuiz(e) {
        e.preventDefault();
        
        const quizId = quizEditIdField.value;
        
        const newQuiz = {
            id: quizId || `q_${new Date().getTime()}`, // Use existing ID if editing
            title: document.getElementById('quiz-title').value,
            description: document.getElementById('quiz-description').value,
            category: document.getElementById('quiz-category').value,
            createdBy: currentUser.username,
            published: false, // Default to draft
            questions: []
        };

        const questionCards = questionsContainer.querySelectorAll('.question-card');
        if (questionCards.length === 0) {
            alert('Please add at least one question.');
            return;
        }

        let formIsValid = true;
        questionCards.forEach(card => {
            const index = card.dataset.qIndex;
            const text = card.querySelector('.q-text').value;
            const type = card.querySelector('.q-type').value;
            
            const options = [];
            card.querySelectorAll('.q-option').forEach(opt => options.push(opt.value));
            
            const correct = [];
            card.querySelectorAll('.q-correct:checked').forEach(correctOpt => {
                correct.push(parseInt(correctOpt.value)); // value is 0-indexed
            });

            if (!text || options.includes('') || correct.length === 0) {
                formIsValid = false;
            }

            newQuiz.questions.push({ text, type, options, correct });
        });

        if (!formIsValid) {
            alert('Please fill out all fields for all questions, and select at least one correct answer.');
            return;
        }

        if (quizId) {
            // Update existing quiz
            const indexToUpdate = quizzes.findIndex(q => q.id === quizId);
            newQuiz.published = quizzes[indexToUpdate].published; // Preserve published status
            quizzes[indexToUpdate] = newQuiz;
        } else {
            // Add new quiz
            quizzes.push(newQuiz);
        }

        // Save to localStorage
        localStorage.setItem('quizzes', JSON.stringify(quizzes));
        
        alert(quizId ? 'Quiz updated successfully!' : 'Quiz saved successfully!');
        resetCreateForm();
        refreshQuizLibrary();
        refreshPreviewList();
        switchTab('quiz-library'); // Move to library
    }

    function resetCreateForm() {
        createQuizForm.reset();
        questionsContainer.innerHTML = '';
        quizEditIdField.value = ''; // Clear edit ID
        saveQuizBtn.textContent = 'Save Quiz';
        questionCounter = 0;
        addQuestion(); // Add one blank question
    }


    // --- QUIZ LIBRARY (Section 2) ---

    function refreshQuizLibrary() {
        libraryContainer.innerHTML = '';
        const myQuizzes = quizzes.filter(q => q.createdBy === currentUser.username);

        if (myQuizzes.length === 0) {
            libraryContainer.innerHTML = '<p>You have not created any quizzes yet.</p>';
            return;
        }

        myQuizzes.forEach(quiz => {
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
                        <button class="btn btn-secondary publish-btn" data-id="${quiz.id}">
                            ${quiz.published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button class="btn edit-btn" data-id="${quiz.id}">Edit</button>
                        <button class="btn btn-danger delete-btn" data-id="${quiz.id}">Delete</button>
                    </div>
                </div>
            `;
            libraryContainer.insertAdjacentHTML('beforeend', quizHtml);
        });
    }

    function togglePublish(quizId) {
        const quiz = quizzes.find(q => q.id === quizId);
        if (quiz) {
            quiz.published = !quiz.published;
            localStorage.setItem('quizzes', JSON.stringify(quizzes));
            refreshQuizLibrary(); // Refresh both lists
            refreshPreviewList();
        }
    }
    
    function deleteQuiz(quizId) {
        if (confirm('Are you sure you want to delete this quiz? This cannot be undone.')) {
            quizzes = quizzes.filter(q => q.id !== quizId);
            localStorage.setItem('quizzes', JSON.stringify(quizzes));
            refreshQuizLibrary();
            refreshPreviewList();
        }
    }

    function loadQuizForEdit(quizId) {
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) return;

        // Switch to the create tab
        switchTab('create-quiz');
        
        // Reset form
        createQuizForm.reset();
        questionsContainer.innerHTML = '';
        questionCounter = 0;

        // Populate fields
        quizEditIdField.value = quiz.id;
        document.getElementById('quiz-title').value = quiz.title;
        document.getElementById('quiz-description').value = quiz.description;
        document.getElementById('quiz-category').value = quiz.category;
        saveQuizBtn.textContent = 'Update Quiz';

        // Populate questions
        quiz.questions.forEach(q => {
            addQuestion(); // This increments questionCounter
            
            document.getElementById(`q-text-${questionCounter}`).value = q.text;
            const typeSelect = document.querySelector(`.q-type[data-q-index="${questionCounter}"]`);
            typeSelect.value = q.type;
            
            // Set options
            q.options.forEach((opt, i) => {
                document.getElementById(`q-${questionCounter}-opt-${i+1}`).value = opt;
            });
            
            // Trigger 'change' event to set radio/checkbox
            typeSelect.dispatchEvent(new Event('change'));

            // Set correct answers
            const correctContainer = document.getElementById(`q-correct-options-${questionCounter}`);
            q.correct.forEach(correctIndex => { // correctIndex is 0-3
                correctContainer.querySelector(`input[value="${correctIndex}"]`).checked = true;
            });
        });
    }

    // --- TAKE QUIZ / PREVIEW (Section 3) ---

    function refreshPreviewList() {
        previewListContainer.innerHTML = '';
        const myQuizzes = quizzes.filter(q => q.createdBy === currentUser.username);

        if (myQuizzes.length === 0) {
            previewListContainer.innerHTML = '<p>Create a quiz to preview it.</p>';
            return;
        }
        
        myQuizzes.forEach(quiz => {
            const quizHtml = `
                <div class="quiz-list-item">
                    <div class="quiz-info">
                        <h3>${quiz.title}</h3>
                        <p>Category: ${quiz.category}</p>
                    </div>
                    <div class="quiz-actions">
                        <button class="btn preview-btn" data-id="${quiz.id}">Preview</button>
                    </div>
                </div>
            `;
            previewListContainer.insertAdjacentHTML('beforeend', quizHtml);
        });
    }

    function loadQuizForPreview(quizId) {
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) return;

        quizPreviewArea.innerHTML = `<h2>Preview: ${quiz.title}</h2>`;

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
                                       name="q-preview-${qIndex}" 
                                       id="q-preview-${qIndex}-opt-${oIndex}" 
                                       value="${oIndex}"
                                       ${q.correct.includes(oIndex) ? 'checked' : ''} 
                                       disabled>
                                <label for="q-preview-${qIndex}-opt-${oIndex}" style="${q.correct.includes(oIndex) ? 'font-weight:bold; color:green;' : ''}">
                                    ${opt}
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            quizPreviewArea.insertAdjacentHTML('beforeend', questionHtml);
        });
        
        quizPreviewArea.insertAdjacentHTML('beforeend', '<p><i>Preview mode: Correct answers are shown.</i></p>');
    }

    // --- START THE APPLICATION ---
    init();
});