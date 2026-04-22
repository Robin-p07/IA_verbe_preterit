document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#verbs-table tbody');
    const addForm = document.getElementById('add-verb-form');
    
    const loadVerbs = async () => {
        try {
            const res = await fetch('/api/verbs');
            const verbs = await res.json();
            const countEl = document.getElementById('total-verbs-count');
            if(countEl) countEl.textContent = `(${verbs.length} verbes)`;
            renderTable(verbs);
        } catch (e) {
            console.error("Failed to load verbs", e);
        }
    };

    const renderTable = (verbs) => {
        tableBody.innerHTML = '';
        verbs.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" value="${v.fr}" class="edit-input" id="fr-${v.id}"></td>
                <td><input type="text" value="${v.base}" class="edit-input" id="base-${v.id}"></td>
                <td><input type="text" value="${v.past}" class="edit-input" id="past-${v.id}"></td>
                <td><input type="text" value="${v.participle}" class="edit-input" id="participle-${v.id}"></td>
                <td><input type="text" value="${v.pastAlt || ''}" class="edit-input" id="pastAlt-${v.id}"></td>
                <td><input type="text" value="${v.participleAlt || ''}" class="edit-input" id="participleAlt-${v.id}"></td>
                <td class="action-btns">
                    <button class="btn btn-secondary btn-small" onclick="updateVerb(${v.id})" title="Sauvegarder">💾</button>
                    <button class="btn-small btn-danger" onclick="deleteVerb(${v.id})" title="Supprimer">🗑️</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    };

    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            fr: document.getElementById('add-fr').value,
            base: document.getElementById('add-base').value,
            past: document.getElementById('add-past').value,
            participle: document.getElementById('add-participle').value,
            pastAlt: document.getElementById('add-past-alt').value,
            participleAlt: document.getElementById('add-participle-alt').value
        };
        try {
            const res = await fetch('/api/admin/verbs', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) {
                addForm.reset();
                loadVerbs();
            } else {
                alert(result.error || "Erreur d'ajout");
            }
        } catch (e) { alert("Erreur d'ajout"); }
    });

    window.updateVerb = async (id) => {
        const data = {
            fr: document.getElementById(`fr-${id}`).value,
            base: document.getElementById(`base-${id}`).value,
            past: document.getElementById(`past-${id}`).value,
            participle: document.getElementById(`participle-${id}`).value,
            pastAlt: document.getElementById(`pastAlt-${id}`).value,
            participleAlt: document.getElementById(`participleAlt-${id}`).value
        };
        try {
            const res = await fetch(`/api/admin/verbs/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) {
                alert("Verbe mis à jour !");
            } else {
                alert(result.error || "Erreur lors de la mise à jour");
            }
        } catch (e) { alert("Erreur lors de la mise à jour"); }
    };

    window.deleteVerb = async (id) => {
        if(!confirm("Êtes-vous sûr de vouloir supprimer ce verbe ?")) return;
        try {
            await fetch(`/api/admin/verbs/${id}`, { method: 'DELETE' });
            loadVerbs();
        } catch (e) { alert("Erreur lors de la suppression"); }
    };

    // Search logic
    const searchInput = document.getElementById('search-verb');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const textContent = Array.from(row.querySelectorAll('input'))
                .map(input => input.value.toLowerCase())
                .join(' ');
            row.style.display = textContent.includes(query) ? '' : 'none';
        });
    });

    loadVerbs();
});
