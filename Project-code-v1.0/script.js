let notes = [], deletedNote = null, editingId = null;

window.onload = () => {
    const saved = localStorage.getItem("notesJSON");
    if (saved) notes = JSON.parse(saved);
    renderNotes();
};

function saveNote() {
    const title = document.getElementById("noteTitle").value.trim();
    const content = document.getElementById("noteContent").value.trim();

    if (!title) return showToast("Ο τίτλος είναι υποχρεωτικός");
    const timestamp = new Date().toISOString();

    if (editingId !== null) {
        const note = notes.find(n => n.id === editingId);
        if (note) {
            note.versions.push({ title: note.title, content: note.content, date: note.dateEdited });
            note.title = title;
            note.content = content;
            note.dateEdited = timestamp;
        }
        editingId = null;
    }
    else {
        notes.push({ id: Date.now(), title, content, dateCreated: timestamp, dateEdited: timestamp, versions: [] });
    }

    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";
    updateStorage();
    renderNotes();
}

function deleteNote(id) {
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
        deletedNote = notes[index];
        notes.splice(index, 1);
        updateStorage();
        renderNotes();
        showToast("Διαγράφηκε. Πατήστε αναίρεση αν έγινε κατά λάθος.");
    }
}

function editNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    editingId = id;
    document.getElementById("noteTitle").value = note.title;
    document.getElementById("noteContent").value = note.content;
}

function exportVersion(version, title, format) {
    const filename = `${title.replace(/\s+/g, '_')}_version.${format}`;

    if (format === "pdf") {
        const doc = new window.jspdf.jsPDF();
        doc.setFont("Times", "normal");
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(`${version.title}\n\n${version.content}`, 180);
        doc.text(lines, 10, 10);
        doc.save(filename);
    }
    else if (format === "doc") {
        const blob = new Blob([`${version.title}\n\n${version.content}`], { type: 'application/msword' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
    else {
        const blob = new Blob([`${version.title}\n\n${version.content}`], { type: 'text/plain' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
}
function showVersions(id) {
    document.querySelectorAll('.modal').forEach(m => m.remove());
    const note = notes.find(n => n.id === id);
    if (!note || !note.versions.length) return showToast("Δεν υπάρχουν εκδόσεις.");

    const modal = document.createElement("div");
    modal.className = "modal";
    const box = document.createElement("div");
    box.className = "modal-box";
    box.className = "modal-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Ιστορικό Εκδόσεων");
    const title = document.createElement("h3");
    title.innerText = "Ιστορικό Εκδόσεων";
    box.appendChild(title);

    note.versions.slice().reverse().forEach((v, i) => {
        const preview = document.createElement("p");
        preview.className = "note-meta";
        preview.innerText = `Τίτλος: ${v.title}\nΠροεπισκόπηση: ${v.content.substring(0, 60)}...`;

        const restoreBtn = document.createElement("button");
        restoreBtn.innerText = `Επαναφορά (${new Date(v.date).toLocaleString()})`;
        restoreBtn.style.marginBottom = "0.5rem";
        restoreBtn.onclick = () => {
            note.title = v.title;
            note.content = v.content;
            note.dateEdited = new Date().toISOString();
            updateStorage();
            modal.remove();
            renderNotes();
        };

        const exportMenuBtn = document.createElement("button");
        exportMenuBtn.innerText = "📤 Εξαγωγή";
        exportMenuBtn.onclick = () => showExportPopup(v, note.title);

        const btns = document.createElement("div");
        btns.style.marginBottom = "0.5rem";
        btns.appendChild(restoreBtn);
        btns.appendChild(exportMenuBtn);

        box.appendChild(preview);
        box.appendChild(btns);
    });

    const cancel = document.createElement("button");
    cancel.innerText = "Κλείσιμο";
    cancel.onclick = () => modal.remove();
    box.appendChild(cancel);

    modal.appendChild(box);
    document.body.appendChild(modal);
}

function showExportPopup(version, title) {
    document.querySelectorAll('.modal').forEach(m => m.remove());
    const popup = document.createElement("div");
    popup.className = "modal";
    const box = document.createElement("div");
    box.className = "modal-box";

    const header = document.createElement("h3");
    header.innerText = "Επιλέξτε μορφή εξαγωγής";
    box.appendChild(header);

    ["txt", "pdf", "doc"].forEach(format => {
        const btn = document.createElement("button");
        btn.innerText = format.toUpperCase();
        btn.style.margin = "0.25rem";
        btn.onclick = () => {
            exportVersion(version, title, format);
            popup.remove();
        };
        box.appendChild(btn);
    });

    const cancel = document.createElement("button");
    cancel.innerText = "Άκυρο";
    cancel.onclick = () => popup.remove();
    cancel.style.marginTop = "1rem";
    box.appendChild(cancel);

    popup.appendChild(box);
    document.body.appendChild(popup);
}

function copyShareLink(id) {
    const url = `${window.location.origin}${window.location.pathname}#noteId=${id}`;
    navigator.clipboard.writeText(url)
        .then(() => showToast("Ο σύνδεσμος αντιγράφηκε στο πρόχειρο!"))
        .catch(() => showToast("Αποτυχία αντιγραφής συνδέσμου."));
}

function loadSharedNote() {
    const hash = window.location.hash;
    if (hash.startsWith("#noteId=")) {
        const id = parseInt(hash.split("=")[1]);
        const note = notes.find(n => n.id === id);

        if (!note) return;

        document.body.innerHTML = `
          <div style="max-width: 800px; margin: 3rem auto; font-family: Inter, sans-serif;">
            <h2>📌 Προβολή Κοινοποιημένης Σημείωσης</h2>
            <div class="note">
              <div class="note-header"><span class="note-title">${note.title}</span></div>
              <div>${note.content}</div>
              <div class="note-meta">Ημερομηνία: ${new Date(note.dateEdited).toLocaleString()}</div>
            </div>
          </div>
        `;
    }
}

window.onload = () => {
    const saved = localStorage.getItem("notesJSON");
    if (saved) notes = JSON.parse(saved);

    if (window.location.hash.startsWith("#noteId=")) {
        loadSharedNote();
    }
    else {
        renderNotes();
    }
};

function exportVersion(version, title, format) {
    const cleanContent = `${version.title}\n\n${version.content}`.replace(/\n/g, '\r\n');
    const filename = `${title.replace(/\s+/g, '_')}_version.${format}`;

    if (format === "pdf") {
        const doc = new window.jspdf.jsPDF();
        doc.setFont("Times", "normal");
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(cleanContent, 180);
        doc.text(lines, 10, 10);
        doc.save(filename);
    }
    else if (format === "doc") {
        const blob = new Blob([cleanContent], { type: 'application/msword' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
    else {
        const blob = new Blob([cleanContent], { type: 'text/plain' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
}

function exportMain(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    showExportPopup(note, note.title);
}

function renderNotes(showOnlyPinned = false) {
    const container = document.getElementById("notesContainer");
    container.innerHTML = "";
    const search = document.getElementById("searchBox").value.toLowerCase();
    const sort = document.getElementById("sortOrder").value;
    let displayNotes = [...notes].filter(n =>
        (n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search)) &&
        (!showOnlyPinned || n.isPinned)
    );

    displayNotes.sort((a, b) => {
        if (b.isPinned !== a.isPinned) return b.isPinned - a.isPinned;
        if (sort === "title") return a.title.localeCompare(b.title);
        return new Date(b.dateEdited) - new Date(a.dateEdited);
    });

    displayNotes.forEach(note => {
        const div = document.createElement("div");
        div.className = "note";
        div.innerHTML = `
        <div class="note-header">
          <span class="note-title">${note.title} <button onclick="togglePin(${note.id})" title="${note.isPinned ? 'Ξεκαρφίτσωμα' : 'Καρφίτσωμα'}" style="background:none; border:none; cursor:pointer; font-size:1.1rem">${note.isPinned ? '⭐' : '☆'}</button></span>
          <div>
            <button onclick="editNote(${note.id})" title="Επεξεργασία">✏️</button>
            <button onclick="deleteNote(${note.id})" title="Διαγραφή">🗑️</button>
            <button onclick="showVersions(${note.id})" title="Ιστορικό Εκδόσεων">📜</button>
            <button onclick="exportMain(${note.id})" title="Εξαγωγή">📤</button>
            <button onclick="copyShareLink(${note.id})" title="Κοινοποίηση με Σύνδεσμο">🔗</button>
            <button onclick="shareNoteToFriend(${note.id})" title="Κοινοποίηση σε Φίλο">👥</button>
          </div>
        </div>
        <div>${note.content}</div>
        <div class="note-meta">Τελευταία ενημέρωση: ${new Date(note.dateEdited).toLocaleString()}</div>
      `;
        container.appendChild(div);
    });
}

function exportOne(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const blob = new Blob([note.title + "\n\n" + note.content], { type: 'text/plain' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${note.title.replace(/\s+/g, '_')}.txt`;
    link.click();
}

function exportAll() {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "StudentNotes.json";
    link.click();
}

function importNotes() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const tmp_data = JSON.parse(reader.result);
                if (tmp_data.id == undefined) {
                    showToast("Σφάλμα κατά την εισαγωγή - ΚΑΚΟΟΟΟΟΟΟΟΟΟ αρχείο");
                    return;
                }

                notes = tmp_data;
                updateStorage();
                renderNotes();
                showToast("Επιτυχής εισαγωγή σημειώσεων.");
            } catch {
                showToast("Σφάλμα κατά την εισαγωγή.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function updateStorage() {
    localStorage.setItem("notesJSON", JSON.stringify(notes));
}

function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem("theme", isDark ? "dark" : "light");
}

window.addEventListener("DOMContentLoaded", () => {
    // window.matchMedia('(prefers-color-scheme: dark)').matches)
    const theme = localStorage.getItem("theme");
    if (theme === "dark") document.body.classList.add("dark");
});
function undoDelete() {
    if (deletedNote) {
        notes.push(deletedNote);
        deletedNote = null;
        updateStorage();
        renderNotes();
        showToast("Ανακτήθηκε η σημείωση.");
    } else {
        showToast("Δεν υπάρχει διαγραμμένη σημείωση.");
    }
}
function searchUserMock() {
    const modal = document.createElement("div");
    modal.className = "modal";

    const box = document.createElement("div");
    box.className = "modal-box";

    const title = document.createElement("h3");
    title.innerText = "🔍 Αναζήτηση Χρήστη";
    box.appendChild(title);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Πληκτρολόγησε όνομα ή email...";
    input.style = "margin-bottom: 1rem; width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #ccc;";
    box.appendChild(input);

    const resultsBox = document.createElement("div");
    resultsBox.style = "margin-bottom: 1rem; font-size: 0.9rem;";
    box.appendChild(resultsBox);

    const searchBtn = document.createElement("button");
    searchBtn.innerText = "🔎 Αναζήτηση";
    searchBtn.onclick = () => {
        const val = input.value.toLowerCase();
        if (!val.trim()) {
            resultsBox.innerHTML = "<i>Πληκτρολόγησε κάτι πρώτα.</i>";
            return;
        }

        const matches = ["nikos@example.com", "kostas@example.com", "maria@example.com"].filter(user =>
            user.toLowerCase().includes(val)
        );

        resultsBox.innerHTML = "";
        if (matches.length === 0) {
            resultsBox.innerHTML = "<i>Δεν βρέθηκαν χρήστες.</i>";
            return;
        }

        matches.forEach(user => {
            const div = document.createElement("div");
            div.innerText = user;
            const addBtn = document.createElement("button");
            addBtn.innerText = "➕ Αίτημα Φιλίας";
            addBtn.onclick = () => {
                showToast(`Εστάλη αίτημα φιλίας προς ${user}`);
                modal.remove();
            };
            div.appendChild(addBtn);
            resultsBox.appendChild(div);
        });
    };
    box.appendChild(searchBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Κλείσιμο";
    cancelBtn.onclick = () => modal.remove();
    cancelBtn.style.marginTop = "1rem";
    box.appendChild(cancelBtn);

    modal.appendChild(box);
    document.body.appendChild(modal);
}

function uploadNoteFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.doc,.docx,.pdf";
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const content = reader.result;
            if (!content || content.trim() === '') {
                showToast("Το αρχείο είναι κενό ή μη υποστηριζόμενο.");
                return;
            }

            const note = {
                id: Date.now(),
                title: file.name.replace(/\.[^.]+$/, ''),
                content: content,
                dateCreated: new Date().toISOString(),
                dateEdited: new Date().toISOString(),
                versions: []
            };

            notes.push(note);
            updateStorage();
            renderNotes();
            showToast("Το αρχείο μετατράπηκε σε σημείωση.");
        };

        if (file.type === "application/pdf") {
            showToast("Δεν υποστηρίζεται ακόμα η ανάγνωση PDF.");
        } else {
            reader.readAsText(file);
        }
    };
    input.click();
}

function shareNoteToFriend(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    const modal = document.createElement("div");
    modal.className = "modal";

    const box = document.createElement("div");
    box.className = "modal-box";

    const title = document.createElement("h3");
    title.innerText = "👥 Κοινοποίηση Σημείωσης";
    box.appendChild(title);

    const select = document.createElement("select");
    ["nikos@example.com", "kostas@example.com", "maria@example.com"].forEach(user => {
        const option = document.createElement("option");
        option.value = user;
        option.innerText = user;
        select.appendChild(option);
    });
    box.appendChild(select);

    const shareBtn = document.createElement("button");
    shareBtn.innerText = "📨 Αποστολή";
    shareBtn.onclick = () => {
        const historyKey = "chatHistory_" + select.value;
        const history = JSON.parse(localStorage.getItem(historyKey)) || [];
        history.push({
            sender: "Εσύ",
            message: `📎 Κοινοποίησες τη σημείωση: "${note.title}"`
        });
        localStorage.setItem(historyKey, JSON.stringify(history));
        showToast(`Η σημείωση κοινοποιήθηκε στον ${select.value}!`);
        modal.remove();
    };
    box.appendChild(shareBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Άκυρο";
    cancelBtn.onclick = () => modal.remove();
    box.appendChild(cancelBtn);

    modal.appendChild(box);
    document.body.appendChild(modal);
}

function openChatMock() {
    const modal = document.createElement("div");
    modal.className = "modal";

    const box = document.createElement("div");
    box.className = "modal-box";

    const title = document.createElement("h3");
    title.innerText = "💬 Συνομιλία με Φίλο";
    box.appendChild(title);

    const select = document.createElement("select");
    ["nikos@example.com", "kostas@example.com", "maria@example.com", "aggelos@example.com", "giwrgos@example.com"].forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
    box.appendChild(select);

    const chatBox = document.createElement("div");
    chatBox.style = "margin-top:1rem; height:150px; background:#f0f0f0; overflow-y:auto; padding:0.5rem; border-radius:8px; font-size:0.9rem";
    box.appendChild(chatBox)

    function loadHistory(user) {
        const history = JSON.parse(localStorage.getItem("chatHistory_" + user)) || [];
        if (history.length === 0) {
            chatBox.innerHTML = "<i>Δεν υπάρχει ιστορικό συνομιλίας.</i>";
        } else {
            chatBox.innerHTML = history.map(m => `<div><b>${m.sender}:</b> ${m.message}</div>`).join("");
        }
    }
    select.onchange = () => loadHistory(select.value);
    loadHistory(select.value);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Mήνυμα...";
    input.style = "margin-top:1rem; width:100%; padding:0.5rem; border-radius:8px; border:1px solid #ccc";
    box.appendChild(input);

    const sendBtn = document.createElement("button");
    sendBtn.innerText = "📨 Αποστολή";
    sendBtn.onclick = () => {
        const user = select.value;
        const msg = input.value.trim();
        if (!msg) return;

        const historyKey = "chatHistory_" + user;
        const history = JSON.parse(localStorage.getItem(historyKey)) || [];
        history.push({ sender: "Εσύ", message: msg });
        localStorage.setItem(historyKey, JSON.stringify(history));

        loadHistory(user);
        input.value = "";
        chatBox.scrollTop = chatBox.scrollHeight;
    };
    box.appendChild(sendBtn);

    const cancel = document.createElement("button");
    cancel.innerText = "Κλείσιμο";
    cancel.style.marginTop = "1rem";
    cancel.onclick = () => modal.remove();
    box.appendChild(cancel);

    modal.appendChild(box);
    document.body.appendChild(modal);
}

function togglePin(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.isPinned = !note.isPinned;
    updateStorage();
    renderNotes();
}