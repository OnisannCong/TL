let notes = JSON.parse(localStorage.getItem("notes") || "[]");

function saveNote() {
  const title = document.getElementById("noteTitle").value.trim();
  const content = document.getElementById("noteContent").value.trim();
  if (!title) return alert("Ο τίτλος είναι υποχρεωτικός");

  const timestamp = new Date().toISOString();
  const note = {
    noteId: Date.now(),
    title,
    content,
    dateCreated: timestamp,
    dateEdited: timestamp,
    dateDeleted: null
  };

  notes.push(note);
  localStorage.setItem("notes", JSON.stringify(notes));
  document.getElementById("noteTitle").value = "";
  document.getElementById("noteContent").value = "";
  renderNotes();
}

function deleteNote(id) {
  const index = notes.findIndex(n => n.noteId === id);
  if (index !== -1) {
    notes[index].dateDeleted = new Date().toISOString();
    localStorage.setItem("notes", JSON.stringify(notes));
    renderNotes();
  }
}

function renderNotes() {
  const container = document.getElementById("notesContainer");
  container.innerHTML = "";
  notes.filter(n => n.dateDeleted === null).forEach(note => {
    const div = document.createElement("div");
    div.className = "note";
    div.innerHTML = `
      <div class="note-header">
        <span class="note-title">${note.title}</span>
        <div>
          <button onclick="editNote(${note.noteId})">✏️</button>
          <button onclick="deleteNote(${note.noteId})">🗑️</button>
          <button onclick="exportNote(${note.noteId}, 'txt')">📤 TXT</button>
          <button onclick="exportNote(${note.noteId}, 'pdf')">📄 PDF</button>
          <button onclick="exportNote(${note.noteId}, 'doc')">📃 DOC</button>
        </div>
      </div>
      <div>${note.content}</div>
      <div class="note-meta">Δημιουργήθηκε: ${new Date(note.dateCreated).toLocaleString()}</div>
    `;
    container.appendChild(div);
  });
}

function editNote(id) {
  const note = notes.find(n => n.noteId === id);
  if (!note) return;
  document.getElementById("noteTitle").value = note.title;
  document.getElementById("noteContent").value = note.content;
  deleteNote(id);
}

async function exportNote(id, format = "txt") {
  const note = notes.find(n => n.noteId === id);
  if (!note) return;
  const filename = `${note.title.replace(/\s+/g, '_')}.${format}`;

  if (format === "pdf") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("Times", "normal");
    doc.setFontSize(12);
    const content = `${note.title}\n\n${note.content}`;
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 10, 10);
    doc.save(filename);
  } else if (format === "doc") {
    const content = `${note.title}\n\n${note.content}`;
    const blob = new Blob([content], {
      type: 'application/msword'
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const blob = new Blob([
      `${note.title}\n\n${note.content}`
    ], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
renderNotes();
