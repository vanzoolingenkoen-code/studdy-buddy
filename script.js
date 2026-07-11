/**
 * StudyBuddy - Huiswerkplanner
 * Uitgebreide JavaScript applicatie met geavanceerde tools
 */

// ==================== CONSTANTEN & VARIABELEN ====================

const STORAGE_KEY = 'studybuddy_tasks';
const NOTES_KEY = 'studybuddy_notes';
const CUSTOM_SUBJECTS_KEY = 'studybuddy_subjects';
const THEME_KEY = 'studybuddy_theme';

// DOM Elements
const taskForm = document.getElementById('taskForm');
const subjectInput = document.getElementById('subject');
const descriptionInput = document.getElementById('description');
const deadlineInput = document.getElementById('deadline');
const priorityInput = document.getElementById('priority');
const estimatedTimeInput = document.getElementById('estimatedTime');
const tasksContainer = document.getElementById('tasksContainer');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const themeToggle = document.getElementById('themeToggle');
const filterButtons = document.querySelectorAll('.filter-btn');

// Navigation buttons
const navStats = document.getElementById('navStats');
const navCalendar = document.getElementById('navCalendar');
const navNotes = document.getElementById('navNotes');
const navSettings = document.getElementById('navSettings');

// Dashboard Elements
const totalTasksEl = document.getElementById('totalTasks');
const completedTasksEl = document.getElementById('completedTasks');
const todayTasksEl = document.getElementById('todayTasks');
const pendingTasksEl = document.getElementById('pendingTasks');

// State variabelen
let tasks = [];
let notes = [];
let customSubjects = [];
let currentFilter = 'all';
let currentSort = 'deadline';
let searchTerm = '';
let currentNote = null;
let timerInterval = null;
let timerSeconds = 1500; // 25 minuten

// ==================== INITIALISATIE ====================

/**
 * Initialiseert de applicatie
 */
function init() {
    // Laad alle data
    loadTasks();
    loadNotes();
    loadCustomSubjects();
    loadTheme();

    // Stel minimale deadline in op vandaag
    const today = new Date().toISOString().split('T')[0];
    deadlineInput.min = today;
    deadlineInput.value = today;

    // Setup event listeners
    setupEventListeners();
    setupModalListeners();
    updateCustomSubjectsDropdown();

    // Render
    render();
}

/**
 * Setup alle event listeners
 */
function setupEventListeners() {
    // Form
    taskForm.addEventListener('submit', handleAddTask);

    // Search & Filter
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        render();
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.closest('.filter-btn').classList.add('active');
            currentFilter = e.target.closest('.filter-btn').dataset.filter;
            render();
        });
    });

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        render();
    });

    // Theme
    themeToggle.addEventListener('click', toggleTheme);

    // Navigation
    navStats.addEventListener('click', () => openModal('statsModal'));
    navCalendar.addEventListener('click', () => openModal('calendarModal'));
    navNotes.addEventListener('click', () => openModal('notesModal'));
    navSettings.addEventListener('click', () => openModal('settingsModal'));

    // Quick actions
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importCalendarBtn').addEventListener('click', importData);

    // Settings
    const themeSetting = document.getElementById('themeSetting');
    themeSetting.checked = document.documentElement.classList.contains('dark-mode');
    themeSetting.addEventListener('change', toggleTheme);

    document.getElementById('addSubjectBtn').addEventListener('click', addCustomSubject);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', importData);
    document.getElementById('resetBtn').addEventListener('click', resetAll);

    // Notes
    document.getElementById('newNoteBtn').addEventListener('click', createNewNote);

    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', previousMonth);
    document.getElementById('nextMonth').addEventListener('click', nextMonth);

    // Timer controls
    document.getElementById('startTimerBtn').addEventListener('click', toggleTimer);
    document.getElementById('resetTimerBtn').addEventListener('click', resetTimer);
}

/**
 * Setup modal listeners
 */
function setupModalListeners() {
    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// ==================== TAAKBEHEER ====================

/**
 * Voegt een nieuwe taak toe
 */
function handleAddTask(e) {
    e.preventDefault();

    if (!subjectInput.value || !descriptionInput.value || !deadlineInput.value) {
        alert('Vul alstublieft alle verplichte velden in.');
        return;
    }

    const newTask = {
        id: Date.now(),
        subject: subjectInput.value,
        description: descriptionInput.value,
        deadline: deadlineInput.value,
        priority: priorityInput.value,
        estimatedTime: parseInt(estimatedTimeInput.value) || 0,
        completed: false,
        dateAdded: new Date().toISOString()
    };

    tasks.push(newTask);
    saveTasks();

    taskForm.reset();
    const today = new Date().toISOString().split('T')[0];
    deadlineInput.value = today;

    render();
    showNotification('Taak succesvol toegevoegd!', 'success');
}

/**
 * Schakelt voltooide status om
 */
function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        render();
    }
}

/**
 * Verwijdert een taak
 */
function deleteTask(taskId) {
    if (confirm('Weet je zeker dat je deze taak wilt verwijderen?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks();
        render();
        showNotification('Taak verwijderd', 'info');
    }
}

/**
 * Opent taakdetails
 */
function openTaskDetails(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById('taskDetailsModal');
    const content = document.getElementById('taskDetailsContent');

    content.innerHTML = `
        <div class="task-details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div>
                <h4 style="margin-bottom: 0.5rem; font-weight: 600;">Vak</h4>
                <p>${escapeHtml(task.subject)}</p>
            </div>
            <div>
                <h4 style="margin-bottom: 0.5rem; font-weight: 600;">Prioriteit</h4>
                <p><span class="priority-badge ${task.priority}">${capitalizeFirst(task.priority)}</span></p>
            </div>
            <div>
                <h4 style="margin-bottom: 0.5rem; font-weight: 600;">Deadline</h4>
                <p>${formatDate(task.deadline)}</p>
            </div>
            <div>
                <h4 style="margin-bottom: 0.5rem; font-weight: 600;">Geschatte Tijd</h4>
                <p>${task.estimatedTime} minuten</p>
            </div>
        </div>
        <div style="margin-top: 1.5rem;">
            <h4 style="margin-bottom: 0.5rem; font-weight: 600;">Omschrijving</h4>
            <p>${escapeHtml(task.description).replace(/\n/g, '<br>')}</p>
        </div>
        <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
            <button class="btn btn-primary" onclick="openFocusMode(${task.id})">
                <i class="fas fa-laptop"></i> Focus Mode
            </button>
            <button class="btn btn-secondary" onclick="closeModal('taskDetailsModal')">
                Sluiten
            </button>
        </div>
    `;

    openModal('taskDetailsModal');
}

// ==================== FOCUS MODE ====================

/**
 * Opent focus mode
 */
function openFocusMode(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('focusTaskTitle').textContent = task.subject;
    document.getElementById('focusTaskDesc').textContent = task.description;

    timerSeconds = (task.estimatedTime || 25) * 60;
    updateTimerDisplay();

    closeModal('taskDetailsModal');
    openModal('focusModeModal');
}

/**
 * Sluit focus mode
 */
function closeFocusMode() {
    stopTimer();
    closeModal('focusModeModal');
}

/**
 * Schakelt timer aan/uit
 */
function toggleTimer() {
    const btn = document.getElementById('startTimerBtn');

    if (timerInterval) {
        stopTimer();
    } else {
        timerInterval = setInterval(() => {
            timerSeconds--;
            updateTimerDisplay();

            if (timerSeconds <= 0) {
                stopTimer();
                showNotification('Timer voltooid! Goed gedaan!', 'success');
            }
        }, 1000);

        btn.innerHTML = '<i class="fas fa-pause"></i> Pauze';
    }
}

/**
 * Stopt de timer
 */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    document.getElementById('startTimerBtn').innerHTML = '<i class="fas fa-play"></i> Start';
}

/**
 * Reset de timer
 */
function resetTimer() {
    stopTimer();
    timerSeconds = 1500;
    updateTimerDisplay();
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ==================== FILTERING & SORTING ====================

/**
 * Haalt gefilterde en gesorteerde taken op
 */
function getFilteredAndSortedTasks() {
    let filtered = [...tasks];

    if (currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    } else if (currentFilter === 'pending') {
        filtered = filtered.filter(t => !t.completed);
    } else if (currentFilter === 'urgent') {
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(t => 
            !t.completed && (t.deadline === today || new Date(t.deadline) < new Date(today))
        );
    }

    if (searchTerm) {
        filtered = filtered.filter(t =>
            t.subject.toLowerCase().includes(searchTerm) ||
            t.description.toLowerCase().includes(searchTerm)
        );
    }

    filtered = sortTasks(filtered);
    return filtered;
}

/**
 * Sorteert taken
 */
function sortTasks(tasksToSort) {
    const sorted = [...tasksToSort];

    switch (currentSort) {
        case 'deadline':
            sorted.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
            break;
        case 'priority':
            const priorityOrder = { hoog: 0, normaal: 1, laag: 2 };
            sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            break;
        case 'subject':
            sorted.sort((a, b) => a.subject.localeCompare(b.subject, 'nl'));
            break;
        case 'date-added':
            sorted.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
            break;
        case 'time':
            sorted.sort((a, b) => (b.estimatedTime || 0) - (a.estimatedTime || 0));
            break;
    }

    return sorted;
}

// ==================== RENDERING ====================

/**
 * Render alle UI
 */
function render() {
    renderTasks();
    updateDashboard();
    updateEmptyState();
}

/**
 * Render taken
 */
function renderTasks() {
    const filtered = getFilteredAndSortedTasks();
    tasksContainer.innerHTML = '';

    filtered.forEach(task => {
        const taskEl = createTaskElement(task);
        tasksContainer.appendChild(taskEl);
    });
}

/**
 * Maakt taak element
 */
function createTaskElement(task) {
    const taskEl = document.createElement('div');
    taskEl.className = 'task-item';
    if (task.completed) taskEl.classList.add('completed');
    if (task.priority === 'hoog') taskEl.classList.add('priority-hoog');

    const today = new Date().toISOString().split('T')[0];
    if (task.deadline === today && !task.completed) {
        taskEl.classList.add('today');
    }

    const deadline = new Date(task.deadline);
    const deadlineText = formatDeadline(task.deadline);
    let deadlineClass = '';

    if (!task.completed) {
        const todayDate = new Date(today);
        if (deadline < todayDate) {
            deadlineClass = 'deadline-overdue';
        } else if (deadline.toDateString() === todayDate.toDateString()) {
            deadlineClass = 'deadline-today';
        } else if ((deadline - todayDate) / (1000 * 60 * 60 * 24) <= 2) {
            deadlineClass = 'deadline-soon';
        }
    }

    taskEl.innerHTML = `
        <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.completed ? 'checked' : ''}
            onchange="event.stopPropagation(); toggleTaskCompletion(${task.id})"
        >
        <div class="task-content" onclick="openTaskDetails(${task.id})">
            <div class="task-header">
                <div class="task-title">
                    <span class="task-subject">${escapeHtml(task.subject)}</span>
                    <span class="priority-badge ${task.priority}">${capitalizeFirst(task.priority)}</span>
                </div>
            </div>
            <p class="task-description">${escapeHtml(task.description)}</p>
            <div class="task-meta">
                <div class="task-meta-item">
                    <i class="fas fa-calendar"></i>
                    <span class="${deadlineClass}">${deadlineText}</span>
                </div>
                ${task.estimatedTime ? `
                <div class="task-meta-item">
                    <i class="fas fa-hourglass-end"></i>
                    <span>${task.estimatedTime} min</span>
                </div>
                ` : ''}
            </div>
        </div>
        <div class="task-actions" onclick="event.stopPropagation();">
            <button class="task-btn task-btn-focus" onclick="openFocusMode(${task.id})" title="Focus Mode">
                <i class="fas fa-laptop"></i>
            </button>
            <button class="task-btn task-btn-delete" onclick="deleteTask(${task.id})" title="Verwijderen">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return taskEl;
}

/**
 * Update dashboard
 */
function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.deadline === today && !t.completed).length;
    const pending = tasks.filter(t => !t.completed).length;

    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;
    todayTasksEl.textContent = todayTasks;
    pendingTasksEl.textContent = pending;
}

/**
 * Update empty state
 */
function updateEmptyState() {
    const filtered = getFilteredAndSortedTasks();
    emptyState.classList.toggle('hidden', filtered.length > 0);
}

// ==================== STATISTIEKEN ====================

/**
 * Render statistieken
 */
function renderStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0) / 60;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-percentage').textContent = percentage + '%';
    document.getElementById('stat-hours').textContent = totalHours.toFixed(1) + 'h';

    // Per vak
    const subjectStats = {};
    tasks.forEach(t => {
        if (!subjectStats[t.subject]) {
            subjectStats[t.subject] = { total: 0, completed: 0, time: 0 };
        }
        subjectStats[t.subject].total++;
        if (t.completed) subjectStats[t.subject].completed++;
        subjectStats[t.subject].time += t.estimatedTime || 0;
    });

    const avgTasks = Object.keys(subjectStats).length > 0
        ? (total / Object.keys(subjectStats).length).toFixed(1)
        : 0;
    document.getElementById('stat-average').textContent = avgTasks;

    // Tabel
    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = '';
    Object.entries(subjectStats).forEach(([subject, stats]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${subject}</td>
            <td>${stats.total}</td>
            <td>${stats.completed}</td>
            <td>${(stats.time / 60).toFixed(1)}h</td>
        `;
        tbody.appendChild(row);
    });

    // Charts
    renderCharts(subjectStats);
}

/**
 * Render charts
 */
function renderCharts(subjectStats) {
    // Subject Chart
    const subjectCtx = document.getElementById('subjectChart');
    if (subjectCtx && subjectCtx.getContext) {
        const ctx = subjectCtx.getContext('2d');
        ctx.clearRect(0, 0, subjectCtx.width, subjectCtx.height);

        const subjects = Object.keys(subjectStats);
        const counts = subjects.map(s => subjectStats[s].total);

        const maxCount = Math.max(...counts, 1);
        const barWidth = subjectCtx.width / subjects.length;
        const barHeight = subjectCtx.height - 40;

        subjects.forEach((subject, i) => {
            const x = i * barWidth + 20;
            const height = (counts[i] / maxCount) * barHeight;
            const y = subjectCtx.height - height - 20;

            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x, y, barWidth - 30, height);

            ctx.fillStyle = '#1f2937';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(subject.substring(0, 3), x + (barWidth - 30) / 2, subjectCtx.height - 5);
        });
    }

    // Priority Chart
    const priorityCtx = document.getElementById('priorityChart');
    if (priorityCtx && priorityCtx.getContext) {
        const ctx = priorityCtx.getContext('2d');
        ctx.clearRect(0, 0, priorityCtx.width, priorityCtx.height);

        const priorities = { hoog: 0, normaal: 0, laag: 0 };
        tasks.forEach(t => priorities[t.priority]++);

        const colors = { hoog: '#ef4444', normaal: '#3b82f6', laag: '#10b981' };
        const total = priorities.hoog + priorities.normaal + priorities.laag;

        if (total === 0) return;

        let angle = 0;
        const centerX = priorityCtx.width / 2;
        const centerY = priorityCtx.height / 2;
        const radius = 80;

        Object.entries(priorities).forEach(([priority, count]) => {
            const sliceAngle = (count / total) * Math.PI * 2;

            ctx.fillStyle = colors[priority];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
            ctx.closePath();
            ctx.fill();

            angle += sliceAngle;
        });

        ctx.font = 'bold 14px sans-serif';
        let y = 20;
        Object.entries(priorities).forEach(([priority, count]) => {
            ctx.fillStyle = colors[priority];
            ctx.fillRect(centerX + 100, y, 15, 15);
            ctx.fillStyle = '#1f2937';
            ctx.textAlign = 'left';
            ctx.fillText(`${capitalizeFirst(priority)}: ${count}`, centerX + 120, y + 12);
            y += 30;
        });
    }
}

// ==================== KALENDER ====================

let currentMonth = new Date();

/**
 * Render kalender
 */
function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    document.getElementById('currentMonth').textContent = 
        currentMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    // Weekday headers
    const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
    weekDays.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day empty';
        header.textContent = day;
        header.style.fontWeight = 'bold';
        header.style.cursor = 'default';
        calendar.appendChild(header);
    });

    // First day of month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];

    // Empty cells
    for (let i = 1; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day empty';
        calendar.appendChild(cell);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = tasks.filter(t => t.deadline === dateStr);

        if (dayTasks.length > 0) {
            cell.classList.add('has-tasks');
        }

        if (dateStr === today) {
            cell.classList.add('today');
        }

        cell.textContent = day;
        cell.addEventListener('click', () => showCalendarDay(dateStr));
        calendar.appendChild(cell);
    }
}

/**
 * Vorige maand
 */
function previousMonth() {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
}

/**
 * Volgende maand
 */
function nextMonth() {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
}

/**
 * Toon taken van geselecteerde dag
 */
function showCalendarDay(dateStr) {
    const dayTasks = tasks.filter(t => t.deadline === dateStr);
    const container = document.getElementById('selectedDayTasks');

    if (dayTasks.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">Geen taken</p>';
        return;
    }

    container.innerHTML = dayTasks.map(t => `
        <div class="calendar-task">
            <strong>${t.subject}</strong><br>
            <small>${t.description.substring(0, 50)}...</small>
        </div>
    `).join('');
}

// ==================== AANTEKENINGEN ====================

/**
 * Maak nieuwe aantekening
 */
function createNewNote() {
    const newNote = {
        id: Date.now(),
        title: 'Nieuwe Aantekening',
        content: '',
        created: new Date().toISOString()
    };

    notes.push(newNote);
    saveNotes();
    selectNote(newNote.id);
    renderNotesList();
}

/**
 * Selecteer aantekening
 */
function selectNote(noteId) {
    currentNote = notes.find(n => n.id === noteId);
    if (!currentNote) return;

    document.getElementById('noNoteSelected').style.display = 'none';
    document.getElementById('noteEditor').style.display = 'block';
    document.getElementById('noteEditor').value = currentNote.content;

    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-note-id="${noteId}"]`)?.classList.add('active');
}

/**
 * Update huidige aantekening
 */
function updateCurrentNote() {
    if (!currentNote) return;
    currentNote.content = document.getElementById('noteEditor').value;
    currentNote.title = currentNote.content.split('\n')[0].substring(0, 50) || 'Lege Aantekening';
    saveNotes();
    renderNotesList();
}

/**
 * Render aantekeningen lijst
 */
function renderNotesList() {
    const list = document.getElementById('notesList');
    list.innerHTML = notes.map(note => `
        <div class="note-item" data-note-id="${note.id}" onclick="selectNote(${note.id})">
            <div class="note-item-title">${escapeHtml(note.title)}</div>
            <div class="note-item-date">${formatDate(note.created)}</div>
        </div>
    `).join('');
}

document.addEventListener('input', (e) => {
    if (e.target.id === 'noteEditor') {
        updateCurrentNote();
    }
});

// ==================== CUSTOM SUBJECTS ====================

/**
 * Voeg custom vak toe
 */
function addCustomSubject() {
    const input = document.getElementById('customSubjectInput');
    const subject = input.value.trim();

    if (!subject) return;

    if (!customSubjects.includes(subject)) {
        customSubjects.push(subject);
        saveCustomSubjects();
        updateCustomSubjectsDropdown();
        renderCustomSubjectsList();
        input.value = '';
        showNotification(`Vak "${subject}" toegevoegd!`, 'success');
    }
}

/**
 * Verwijder custom vak
 */
function removeCustomSubject(subject) {
    customSubjects = customSubjects.filter(s => s !== subject);
    saveCustomSubjects();
    updateCustomSubjectsDropdown();
    renderCustomSubjectsList();
}

/**
 * Update dropdown met custom vakken
 */
function updateCustomSubjectsDropdown() {
    const select = document.getElementById('subject');
    const defaultOptions = Array.from(select.querySelectorAll('option')).slice(0, 15);

    select.innerHTML = '';
    defaultOptions.forEach(opt => select.appendChild(opt.cloneNode(true)));

    customSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        select.appendChild(option);
    });
}

/**
 * Render custom vakken lijst
 */
function renderCustomSubjectsList() {
    const list = document.getElementById('customSubjectsList');
    list.innerHTML = customSubjects.map(subject => `
        <div class="subject-tag">
            ${subject}
            <button type="button" onclick="removeCustomSubject('${subject}')">×</button>
        </div>
    `).join('');
}

// ==================== MODALS ====================

/**
 * Open modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('active');

    // Trigger specific modal setups
    if (modalId === 'statsModal') {
        renderStatistics();
    } else if (modalId === 'calendarModal') {
        currentMonth = new Date();
        renderCalendar();
    } else if (modalId === 'notesModal') {
        renderNotesList();
        if (notes.length > 0 && !currentNote) {
            selectNote(notes[0].id);
        }
    } else if (modalId === 'settingsModal') {
        renderCustomSubjectsList();
    }
}

/**
 * Sluit modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// ==================== IMPORT/EXPORT ====================

/**
 * Exporteer gegevens
 */
function exportData() {
    const data = {
        tasks,
        notes,
        customSubjects,
        exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `studybuddy_backup_${new Date().getTime()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showNotification('Gegevens geëxporteerd!', 'success');
}

/**
 * Importeer gegevens
 */
function importData() {
    const input = document.getElementById('fileInput');
    input.click();

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (confirm('Weet je zeker dat je de huidige gegevens wilt vervangen?')) {
                    tasks = data.tasks || [];
                    notes = data.notes || [];
                    customSubjects = data.customSubjects || [];

                    saveTasks();
                    saveNotes();
                    saveCustomSubjects();

                    updateCustomSubjectsDropdown();
                    render();

                    showNotification('Gegevens succesvol geïmporteerd!', 'success');
                }
            } catch (error) {
                showNotification('Fout bij importeren: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }, { once: true });
}

/**
 * Wis alles
 */
function resetAll() {
    if (confirm('LET OP: Dit zal ALLES wissen. Weet je dit zeker?')) {
        if (confirm('Echt ALLES wissen? Dit kan niet ongedaan gemaakt worden!')) {
            localStorage.clear();
            tasks = [];
            notes = [];
            customSubjects = [];
            currentNote = null;

            updateCustomSubjectsDropdown();
            render();

            showNotification('Alles gewist', 'info');
        }
    }
}

// ==================== LOCALSTORAGE ====================

/**
 * Laad taken
 */
function loadTasks() {
    const stored = localStorage.getItem(STORAGE_KEY);
    tasks = stored ? JSON.parse(stored) : [];
}

/**
 * Sla taken op
 */
function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * Laad aantekeningen
 */
function loadNotes() {
    const stored = localStorage.getItem(NOTES_KEY);
    notes = stored ? JSON.parse(stored) : [];
}

/**
 * Sla aantekeningen op
 */
function saveNotes() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

/**
 * Laad custom vakken
 */
function loadCustomSubjects() {
    const stored = localStorage.getItem(CUSTOM_SUBJECTS_KEY);
    customSubjects = stored ? JSON.parse(stored) : [];
}

/**
 * Sla custom vakken op
 */
function saveCustomSubjects() {
    localStorage.setItem(CUSTOM_SUBJECTS_KEY, JSON.stringify(customSubjects));
}

// ==================== THEMA ====================

/**
 * Laad thema
 */
function loadTheme() {
    const theme = localStorage.getItem(THEME_KEY);
    if (theme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        updateThemeIcon();
    }
}

/**
 * Wissel thema
 */
function toggleTheme() {
    document.documentElement.classList.toggle('dark-mode');
    const isDark = document.documentElement.classList.contains('dark-mode');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    updateThemeIcon();

    const themeSetting = document.getElementById('themeSetting');
    if (themeSetting) {
        themeSetting.checked = isDark;
    }
}

/**
 * Update thema icoon
 */
function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark-mode');
    themeToggle.innerHTML = isDark 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
}

// ==================== UTILITY FUNCTIES ====================

/**
 * Formateer deadline naar leesbare tekst
 */
function formatDeadline(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Vandaag';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Morgen';
    } else if (date.toDateString() === dayAfterTomorrow.toDateString()) {
        return 'Overmorgen';
    } else if (date < today) {
        const daysOverdue = Math.floor((today - date) / (1000 * 60 * 60 * 24));
        return `${daysOverdue} dag${daysOverdue !== 1 ? 'en' : ''} geleden`;
    } else {
        const daysUntil = Math.floor((date - today) / (1000 * 60 * 60 * 24));
        return `Over ${daysUntil} dag${daysUntil !== 1 ? 'en' : ''}`;
    }
}

/**
 * Formateer datum
 */
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Escape HTML characters
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Kapitaliseer eerste letter
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Toon notificatie
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 1500;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== START APPLICATIE ====================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}