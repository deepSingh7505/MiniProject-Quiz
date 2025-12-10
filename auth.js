document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize localStorage if it doesn't exist
    if (!localStorage.getItem('users')) {
        // Create the default 'Deep' admin user
        const defaultUsers = [
            {
                username: "admin",
                password: "1212", // In a real app, hash this!
                role: "admin"
            }
        ];
        localStorage.setItem('users', JSON.stringify(defaultUsers));
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
            const role = document.getElementById('role').value; // Role from dropdown

            const users = JSON.parse(localStorage.getItem('users'));
            
            // --- SIMPLIFIED LOGIN CHECK ---
            // Find a user that matches all three fields
            const user = users.find(
                (u) => u.username === username && u.password === password && u.role === role
            );

            if (user) {
                // Save current user to localStorage
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // Redirect to the correct dashboard based on role
                if (user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else if (user.role === 'teacher') {
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

            // Admin cannot register from this page
            if (role === 'admin') {
                alert('Admin registration is not allowed from this page.');
                return;
            }

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