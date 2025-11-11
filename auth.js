document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize localStorage if it doesn't exist
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('quizzes')) {
        localStorage.setItem('quizzes', JSON.stringify([]));
    }
    if (!localStorage.getItem('studentAttempts')) {
        localStorage.setItem('studentAttempts', JSON.stringify([]));
    }

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            const users = JSON.parse(localStorage.getItem('users'));
            
            const user = users.find(
                (u) => u.username === username && u.password === password && u.role === role
            );

            if (user) {
                // Save current user to localStorage
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // Redirect to the correct dashboard
                if (user.role === 'teacher') {
                    window.location.href = 'teacher.html';
                } else {
                    window.location.href = 'student.html';
                }
            } else {
                alert('Invalid username, password, or role.');
            }
        });
    }

    // Handle Register
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const role = document.getElementById('role').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }

            const users = JSON.parse(localStorage.getItem('users'));

            if (users.find((u) => u.username === username)) {
                alert('Username already exists.');
                return;
            }

            // Add new user
            const newUser = { username, password, role };
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));

            alert('Registration successful! Please login.');
            window.location.href = 'index.html';
        });
    }
});