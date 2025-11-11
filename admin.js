document.addEventListener('DOMContentLoaded', () => {

    const userListContainer = document.getElementById('user-list-container');

    // Function to load and display all users
    function loadUsers() {
        // Clear the current list
        userListContainer.innerHTML = '';
        
        const users = JSON.parse(localStorage.getItem('users')) || [];

        if (users.length === 0) {
            userListContainer.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
            return;
        }

        users.forEach((user, index) => {
            const userRow = `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.password}</td> <td>${user.role}</td>
                    <td>
                        <button class="btn btn-danger remove-user-btn" data-index="${index}">Remove</button>
                    </td>
                </tr>
            `;
            userListContainer.insertAdjacentHTML('beforeend', userRow);
        });
    }

    // Handle clicks on the "Remove" button
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-user-btn')) {
            const userIndex = parseInt(e.target.dataset.index);
            
            if (confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
                let users = JSON.parse(localStorage.getItem('users')) || [];
                
                // Remove the user at the specified index
                users.splice(userIndex, 1);
                
                // Save the updated user list back to localStorage
                localStorage.setItem('users', JSON.stringify(users));
                
                // Refresh the table
                loadUsers();
            }
        }
    });

    // Initial load of the user list
    loadUsers();
});