document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#users-table tbody');
    
    const loadUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const users = await res.json();
            renderTable(users);
        } catch (e) {
            console.error("Failed to load users", e);
        }
    };

    const renderTable = (users) => {
        tableBody.innerHTML = '';
        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; opacity: 0.7;">Aucun autre utilisateur trouvé.</td></tr>';
            return;
        }

        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td class="action-btns">
                    <button class="btn-small btn-danger" onclick="deleteUser(${u.id})" title="Supprimer cet utilisateur">🗑️ Supprimer</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    };

    window.deleteUser = async (id) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur définitivement ? (Son historique sera perdu)")) return;
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadUsers();
            } else {
                const data = await res.json();
                alert(data.error || "Erreur lors de la suppression.");
            }
        } catch (e) {
            console.error("Delete failed", e);
            alert("Erreur réseau lors de la suppression.");
        }
    };

    loadUsers();
});
