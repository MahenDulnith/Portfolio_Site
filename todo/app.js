'use strict';

/**
 * ============================================================================
 * ProjectFlow — app.js
 * Accordion-based Project Breakdown Tracker
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ─── Constants ──────────────────────────────────────────────────────────────

  const STORAGE_KEY_TASKS    = 'projectTracker_tasks';
  const STORAGE_KEY_PROJECTS = 'projectTracker_projects';
  const EXPAND_KEY           = 'projectTracker_expanded';
  const DEBOUNCE_MS          = 300;
  const TOAST_MS             = 3000;

  const STATUS_CYCLE = ['Pending', 'In Progress', 'Done'];

  // ─── Seed Data (from Excel) ─────────────────────────────────────────────────

  const SEED_PROJECTS = ['Facebook Income', 'Fiverr Income'];

  const SEED_TASKS = [
    { id: 1,  project: 'Facebook Income', action: 'Make new email address',        assignee: 'Mahen',  priority: 'High',   status: 'Done',    dueDate: '', notes: '' },
    { id: 2,  project: 'Facebook Income', action: 'Make new Facebook account',     assignee: 'Mahen',  priority: 'High',   status: 'Done',    dueDate: '', notes: '' },
    { id: 3,  project: 'Facebook Income', action: 'Create Facebook Page',          assignee: 'Mahen',  priority: 'High',   status: 'Pending', dueDate: '', notes: '' },
    { id: 4,  project: 'Facebook Income', action: 'Find category to post',         assignee: 'Sahan',  priority: 'Medium', status: 'Pending', dueDate: '', notes: '' },
    { id: 5,  project: 'Facebook Income', action: 'Make 10 topics per category',   assignee: 'Sahan',  priority: 'High',   status: 'Pending', dueDate: '', notes: '' },
    { id: 6,  project: 'Facebook Income', action: 'Find data for project 1-10',    assignee: 'Sahan',  priority: 'Medium', status: 'Pending', dueDate: '', notes: '' },
    { id: 7,  project: 'Facebook Income', action: 'Make video 1-10',               assignee: 'Mahen',  priority: 'High',   status: 'Pending', dueDate: '', notes: '' },
    { id: 8,  project: 'Facebook Income', action: 'Upload scheduled video 1-10',   assignee: 'Mahen',  priority: 'High',   status: 'Pending', dueDate: '', notes: '' },
    { id: 9,  project: 'Fiverr Income',  action: 'Create Fiverr Account',         assignee: 'Mahen',  priority: 'High',   status: 'Pending', dueDate: '', notes: '' },
    { id: 10, project: 'Fiverr Income',  action: 'Create Fiverr Gig',             assignee: 'Sahan',  priority: 'High',   status: 'Pending', dueDate: '', notes: '' },
    { id: 11, project: 'Fiverr Income',  action: 'Research Competitors',           assignee: 'Sahan',  priority: 'Medium', status: 'Pending', dueDate: '', notes: '' },
  ];

  // ─── DOM References ─────────────────────────────────────────────────────────

  const $ = (id) => document.getElementById(id);

  const dom = {
    board:             $('board'),
    progressPercent:   $('progressPercent'),
    overallProgress:   $('overallProgress'),
    statsRow:          $('statsRow'),
    searchInput:       $('searchInput'),
    filterProject:     $('filterProject'),
    filterAssignee:    $('filterAssignee'),
    filterPriority:    $('filterPriority'),
    filterStatus:      $('filterStatus'),
    
    // Task Modal
    taskModal:         $('taskModal'),
    taskForm:          $('taskForm'),
    modalClose:        $('modalClose'),
    cancelBtn:         $('cancelBtn'),
    modalTitle:        $('modalTitle'),
    taskProject:       $('taskProject'),
    taskActionContainer:$('taskActionContainer'),
    taskAssignee:      $('taskAssignee'),
    taskPriority:      $('taskPriority'),
    taskStatus:        $('taskStatus'),
    taskDueDate:       $('taskDueDate'),
    taskNotes:         $('taskNotes'),
    projectList:       $('projectList'),
    
    // Project Modal
    projectModal:      $('projectModal'),
    projectForm:       $('projectForm'),
    projectModalClose: $('projectModalClose'),
    projectCancelBtn:  $('projectCancelBtn'),
    newProjectName:    $('newProjectName'),
    importProjectBtn:  $('importProjectBtn'),

    // Confirm Modal
    confirmModal:      $('confirmModal'),
    confirmModalText:  $('confirmModalText'),
    confirmProjectInputContainer: $('confirmProjectInputContainer'),
    confirmProjectInput: $('confirmProjectInput'),
    confirmDeleteBtn:  $('confirmDeleteBtn'),
    confirmCancelBtn:  $('confirmCancelBtn'),
    
    // Options
    projectOptionsModal:$('projectOptionsModal'),
    projectOptionsTitle:$('projectOptionsTitle'),
    optRenameBtn:      $('optRenameBtn'),
    optDeleteBtn:      $('optDeleteBtn'),
    optCancelBtn:      $('optCancelBtn'),
    
    // Edit Project Modal
    editProjectModal:  $('editProjectModal'),
    editProjectForm:   $('editProjectForm'),
    editProjectName:   $('editProjectName'),
    editProjectModalClose: $('editProjectModalClose'),
    editProjectCancelBtn:  $('editProjectCancelBtn'),
    editProjectDeleteBtn:  $('editProjectDeleteBtn'),

    // User Profile
    userProfileBtn:    $('userProfileBtn'),
    currentUserDisplay:$('currentUserDisplay'),
    userSelectModal:   $('userSelectModal'),
    
    importFileInput:   $('importFileInput'),
    importTaskBtn:     $('importTaskBtn'),
    importTaskFileInput:$('importTaskFileInput'),

    toastContainer:    $('toastContainer'),
  };

  // ─── State ──────────────────────────────────────────────────────────────────

  let tasks = [];
  let projects = [];
  let editingId = null;
  let itemToDelete = null;
  let deleteType = 'task';
  let debounceTimer = null;
  let expandedProjects = new Set();
  let pendingNewProjectTasks = [];
  let currentUser = localStorage.getItem('todo_user') || null;
  let projectToEdit = null;

  let db = null;

  // ─── Data Layer ─────────────────────────────────────────────────────────────

  function loadData() {
    try {
      const firebaseConfig = {
        apiKey: "AIzaSyD2kcpYC6HRkXmKyueoMenylJmoN4nnq5g",
        authDomain: "productive-to-do.firebaseapp.com",
        projectId: "productive-to-do",
        storageBucket: "productive-to-do.firebasestorage.app",
        messagingSenderId: "196571366260",
        appId: "1:196571366260:web:be85d4f8843505cd5f6221"
      };
      
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();

      // Setup Realtime Listeners
      db.collection('projects').onSnapshot(snapshot => {
        projects = snapshot.docs.map(doc => doc.id);
        populateFilters();
        renderBoard();
      });

      db.collection('tasks').onSnapshot(snapshot => {
        tasks = snapshot.docs.map(doc => doc.data());
        populateFilters();
        renderBoard();
        updateProgress();
      });
      
    } catch (err) {
      console.error("Firebase init failed:", err);
      showToast("Could not connect to database.", "error");
    }
  }

  // We no longer rely on manual array saving for remote data. 
  // These functions are left empty to prevent crashes in existing code before we fully migrate the mutation points.
  function saveTasks() {}
  function saveProjects() {}

  function loadExpanded() {
    try {
      const raw = localStorage.getItem(EXPAND_KEY);
      expandedProjects = raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      expandedProjects = new Set();
    }
  }

  function saveExpanded() {
    localStorage.setItem(EXPAND_KEY, JSON.stringify([...expandedProjects]));
  }

  function getNextTaskId() {
    // Return a random 20-character Firestore ID
    return db ? db.collection('tasks').doc().id : Date.now().toString();
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  }

  function getInitials(name) {
    if (!name) return '??';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return name.slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  // ─── Filters ────────────────────────────────────────────────────────────────

  function populateFilters() {
    const activeProjects = [...new Set(tasks.map(t => t.project))].sort();
    const assignees = [...new Set(tasks.map(t => t.assignee))].sort();

    fillSelect(dom.filterProject,  activeProjects,  'All Projects');
    fillSelect(dom.filterAssignee, assignees, 'All Assignees');
  }

  function fillSelect(el, options, allLabel) {
    const current = el.value;
    el.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = allLabel;
    el.appendChild(allOpt);
    options.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      el.appendChild(opt);
    });
    if (current && options.includes(current)) el.value = current;
  }

  function getFilteredTasks() {
    const query    = (dom.searchInput.value || '').trim().toLowerCase();
    const project  = dom.filterProject.value;
    const assignee = dom.filterAssignee.value;
    const priority = dom.filterPriority.value;
    const status   = dom.filterStatus.value;

    return tasks.filter(t => {
      if (project  && t.project  !== project)  return false;
      if (assignee && t.assignee !== assignee) return false;
      if (priority && t.priority !== priority) return false;
      if (status   && t.status   !== status)   return false;
      if (query) {
        const hay = [t.action, t.project, t.assignee, t.notes].join(' ').toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }

  // ─── Progress ───────────────────────────────────────────────────────────────

  function updateProgress() {
    const total = tasks.length;
    const done  = tasks.filter(t => t.status === 'Done').length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    dom.progressPercent.textContent = `${pct}%`;
    dom.overallProgress.style.width = `${pct}%`;

    dom.statsRow.innerHTML = `
      <span class="stat-chip">
        <span class="stat-dot" style="background: var(--status-done)"></span>
        <span class="stat-count">${done}</span> Done
      </span>
      <span class="stat-chip">
        <span class="stat-dot" style="background: var(--status-progress)"></span>
        <span class="stat-count">${inProgress}</span> In Progress
      </span>
      <span class="stat-chip">
        <span class="stat-dot" style="background: var(--status-pending)"></span>
        <span class="stat-count">${pending}</span> Pending
      </span>
      <span class="stat-chip">
        <span class="stat-dot" style="background: var(--text-muted)"></span>
        <span class="stat-count">${total}</span> Total
      </span>
    `;
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────

  function renderBoard() {
    const filteredTasks = getFilteredTasks();

    const currentHeight = dom.board.offsetHeight;
    dom.board.style.minHeight = currentHeight + 'px';

    dom.board.innerHTML = '';

    if (projects.length === 0) {
      dom.board.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No projects found</h3>
          <p>Create your first project to get started.</p>
        </div>
      `;
      appendNewProjectBtn();
      updateProgress();
      requestAnimationFrame(() => { dom.board.style.minHeight = ''; });
      return;
    }

    projects.forEach(projectName => {
      const projectTasks = filteredTasks.filter(t => t.project === projectName);
      
      const hasFilters = dom.searchInput.value || dom.filterProject.value || dom.filterAssignee.value || dom.filterPriority.value || dom.filterStatus.value;
      if (hasFilters && projectTasks.length === 0) {
        return;
      }

      const accordion = createProjectAccordion(projectName, projectTasks);
      dom.board.appendChild(accordion);
    });

    if (dom.board.children.length === 0) {
       dom.board.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>No matches found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      `;
    }

    appendNewProjectBtn();
    updateProgress();
    requestAnimationFrame(() => { dom.board.style.minHeight = ''; });
  }

  function appendNewProjectBtn() {
    const newProjectBtn = document.createElement('button');
    newProjectBtn.className = 'btn-new-project';
    newProjectBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      New Project
    `;
    newProjectBtn.addEventListener('click', () => openProjectModal());
    dom.board.appendChild(newProjectBtn);
  }

  function createProjectAccordion(projectName, projectTasks) {
    const isExpanded = expandedProjects.has(projectName);
    const done = projectTasks.filter(t => t.status === 'Done').length;
    const pending = projectTasks.filter(t => t.status === 'Pending').length;
    const inProgress = projectTasks.filter(t => t.status === 'In Progress').length;
    const total = projectTasks.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    const el = document.createElement('div');
    el.className = `project-accordion${isExpanded ? ' is-expanded' : ''}`;
    el.dataset.project = projectName;

    const header = document.createElement('div');
    header.className = 'accordion-header';

    const icon = document.createElement('div');
    icon.className = 'project-icon';
    icon.textContent = getInitials(projectName);

    const info = document.createElement('div');
    info.className = 'accordion-info';

    const title = document.createElement('div');
    title.className = 'accordion-title';
    title.textContent = projectName;

    const progressRow = document.createElement('div');
    progressRow.className = 'accordion-progress';

    const progressBar = document.createElement('div');
    progressBar.className = 'accordion-progress-bar';
    progressBar.innerHTML = `<div class="accordion-progress-fill" style="width: ${pct}%"></div>`;

    const progressText = document.createElement('span');
    progressText.className = 'accordion-progress-text';
    progressText.textContent = `${done}/${total} done`;

    progressRow.appendChild(progressBar);
    progressRow.appendChild(progressText);
    info.appendChild(title);
    info.appendChild(progressRow);

    const right = document.createElement('div');
    right.className = 'accordion-right';

    const stats = document.createElement('div');
    stats.className = 'accordion-stats';
    if (done > 0)       stats.innerHTML += `<span class="mini-stat mini-stat-done">✓ ${done}</span>`;
    if (inProgress > 0) stats.innerHTML += `<span class="mini-stat mini-stat-progress">◐ ${inProgress}</span>`;
    if (pending > 0)    stats.innerHTML += `<span class="mini-stat mini-stat-pending">○ ${pending}</span>`;

    const chevron = document.createElement('div');
    chevron.className = 'accordion-chevron';
    chevron.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    right.appendChild(stats);
    right.appendChild(chevron);
    header.appendChild(icon);
    header.appendChild(info);
    header.appendChild(right);

    const body = document.createElement('div');
    body.className = 'accordion-body';

    const content = document.createElement('div');
    content.className = 'accordion-content';

    const list = document.createElement('div');
    list.className = 'tasks-list';

    if (projectTasks.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.9rem;">No tasks yet. Create one!</div>`;
    } else {
      projectTasks.forEach(task => {
        list.appendChild(createTaskItem(task));
      });
    }

    content.appendChild(list);

    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.gap = '12px';
    actionsDiv.style.alignItems = 'center';

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add-task-inline';
    addBtn.dataset.project = projectName;
    addBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Add Task
    `;
    actionsDiv.appendChild(addBtn);

    content.appendChild(actionsDiv);

    body.appendChild(content);
    el.appendChild(header);
    el.appendChild(body);

    if (isExpanded) {
      requestAnimationFrame(() => {
        body.style.maxHeight = body.scrollHeight + 'px';
      });
    }

    // Long Press on Header to Edit Project
    addLongPressListener(
      header,
      () => toggleAccordion(el, projectName), // Tap
      () => openEditProjectModal(projectName) // Hold
    );

    return el;
  }

  function createTaskItem(task) {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.dataset.id = task.id;
    item.dataset.status = task.status;
    item.dataset.priority = task.priority;

    const toggle = document.createElement('button');
    toggle.className = 'task-status-toggle';
    toggle.dataset.id = task.id;
    toggle.title = `Status: ${task.status} — Click to change`;
    toggle.setAttribute('aria-label', `Toggle status for ${task.action}`);

    const info = document.createElement('div');
    info.className = 'task-info';

    const name = document.createElement('span');
    name.className = 'task-name';
    name.textContent = task.action;

    const details = document.createElement('div');
    details.className = 'task-details';

    if (task.assignee) {
        details.innerHTML += `<span class="task-detail"><span class="task-detail-icon">👤</span> ${escapeHtml(task.assignee)}</span>`;
    }

    if (task.dueDate) {
      details.innerHTML += `<span class="task-detail"><span class="task-detail-icon">📅</span> ${escapeHtml(formatDate(task.dueDate))}</span>`;
    }

    if (task.notes && task.notes.trim()) {
      details.innerHTML += `<span class="task-detail"><span class="task-detail-icon">📝</span> ${escapeHtml(task.notes)}</span>`;
    }

    info.appendChild(name);
    info.appendChild(details);

    const tags = document.createElement('div');
    tags.className = 'task-tags';

    if (task.priority) {
        const priorityTag = document.createElement('span');
        priorityTag.className = `priority-tag priority-tag-${task.priority.toLowerCase()}`;
        priorityTag.textContent = task.priority;
        tags.appendChild(priorityTag);
    }
    
    if (task.assignee) {
        const assigneeTag = document.createElement('span');
        assigneeTag.className = 'assignee-tag';
        assigneeTag.textContent = task.assignee;
        tags.appendChild(assigneeTag);
    }

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon edit-btn';
    editBtn.dataset.id = task.id;
    editBtn.title = 'Edit';
    editBtn.innerHTML = '✏️';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon delete-btn';
    deleteBtn.dataset.id = task.id;
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '🗑️';

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(toggle);
    item.appendChild(info);
    item.appendChild(tags);
    item.appendChild(actions);

    return item;
  }

  function toggleAccordion(el, projectName) {
    const body = el.querySelector('.accordion-body');
    const isExpanded = el.classList.contains('is-expanded');

    if (isExpanded) {
      body.style.maxHeight = body.scrollHeight + 'px';
      requestAnimationFrame(() => {
        body.style.maxHeight = '0px';
      });
      el.classList.remove('is-expanded');
      expandedProjects.delete(projectName);
    } else {
      el.classList.add('is-expanded');
      body.style.maxHeight = body.scrollHeight + 'px';
      expandedProjects.add(projectName);

      body.addEventListener('transitionend', function handler() {
        if (el.classList.contains('is-expanded')) {
          body.style.maxHeight = 'none';
        }
        body.removeEventListener('transitionend', handler);
      });
    }
    saveExpanded();
  }

  // ─── Task Modal ─────────────────────────────────────────────────────────────

  function openTaskModal(taskId = null, prefilledProject) {
    editingId = taskId;
    dom.modalTitle.textContent = taskId ? 'Edit Task' : 'Add New Task';

    dom.taskActionContainer.innerHTML = '';

    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      dom.taskProject.value  = task.project;
      
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-input task-action-input';
      input.value = task.action;
      input.required = true;
      dom.taskActionContainer.appendChild(input);

      dom.taskAssignee.value = task.assignee || '';
      dom.taskPriority.value = task.priority || 'Medium';
      dom.taskStatus.value   = task.status;
      dom.taskDueDate.value  = task.dueDate || '';
      dom.taskNotes.value    = task.notes || '';
      dom.taskProject.readOnly = true;
    } else {
      dom.taskForm.reset();
      dom.taskProject.readOnly = false;
      addBlankTaskInput();

      dom.taskAssignee.value = currentUser;
      dom.taskPriority.value = 'Medium';
      dom.taskStatus.value   = 'Pending';

      if (prefilledProject) {
        dom.taskProject.value = prefilledProject;
        dom.taskProject.readOnly = true;
      }
    }

    updateDataLists();
    dom.taskModal.classList.add('is-active');

    if (prefilledProject) {
      dom.taskActionContainer.querySelector('.task-action-input').focus();
    } else {
      dom.taskProject.focus();
    }
  }

  function addBlankTaskInput() {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input task-action-input';
    input.placeholder = 'What needs to be done?';
    dom.taskActionContainer.appendChild(input);
    return input;
  }

  function closeTaskModal() {
    dom.taskModal.classList.remove('is-active');
    editingId = null;
    dom.taskProject.readOnly = false;
    dom.taskForm.reset();
  }

  function updateDataLists() {
    dom.projectList.innerHTML = '';
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      dom.projectList.appendChild(opt);
    });
  }

  function handleTaskSubmit(e) {
    e.preventDefault();

    const project = dom.taskProject.value.trim();
    const actionInputs = Array.from(dom.taskActionContainer.querySelectorAll('.task-action-input'));
    const actions = actionInputs.map(inp => inp.value.trim()).filter(val => val !== '');

    const assignee = dom.taskAssignee.value;
    const priority = dom.taskPriority.value;
    const status   = dom.taskStatus.value;
    const dueDate  = dom.taskDueDate.value;
    const notes    = dom.taskNotes.value.trim();

    if (!project || actions.length === 0) {
      showToast('Please provide a project and at least one task name.', 'error');
      return;
    }

    if (!projects.includes(project)) {
      db.collection('projects').doc(project).set({ name: project });
    }

    if (editingId) {
      db.collection('tasks').doc(String(editingId)).set(
        { project, action: actions[0], assignee, priority, status, dueDate, notes },
        { merge: true }
      );
      showToast('Task updated!', 'success');
      closeTaskModal();
    } else {
      const batch = db.batch();
      actions.forEach(actionText => {
        const newId = getNextTaskId();
        batch.set(db.collection('tasks').doc(newId), { id: newId, project, action: actionText, assignee, priority, status, dueDate, notes });
      });
      batch.commit().then(() => {
        expandedProjects.add(project);
        saveExpanded();
        showToast(`${actions.length} task(s) added!`, 'success');
        dom.taskActionContainer.innerHTML = '';
        const input = addBlankTaskInput();
        input.focus();
        closeTaskModal();
      }).catch(err => console.error(err));
    }
  }

  function exportProject(projectName) {
    const projectTasks = tasks.filter(t => t.project === projectName);
    if (projectTasks.length === 0) {
      showToast('Project is empty.', 'error');
      return;
    }
    
    let text = projectTasks.map(t => `- ${t.action}`).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${projectName}.txt`, 'success');
  }

  function exportSampleProject() {
    let text = `[INSTRUCTIONS FOR AI]
Please break down the project we just discussed into small, actionable steps.
Follow the exact format below.
- Do NOT include a title, project name, or any source citations.
- Keep each step concise and short (break long steps into multiple smaller steps).
- Do NOT include this instruction block in your output. Just give me the list.
- CRITICAL: Please output your response as a downloadable .txt file!

- Do the first thing
- Do the next thing
- Finish the task`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prompt_Template.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('AI Prompt Template downloaded!', 'success');
  }

  // ─── Project Modal ──────────────────────────────────────────────────────────

  function openProjectModal() {
    dom.projectForm.reset();
    dom.projectModal.classList.add('is-active');
    dom.newProjectName.focus();
  }

  function closeProjectModal() {
    dom.projectModal.classList.remove('is-active');
    dom.projectForm.reset();
  }

  function handleProjectSubmit(e) {
    e.preventDefault();
    const projectName = dom.newProjectName.value.trim();
    
    if (!projectName) {
        showToast('Project name is required.', 'error');
        return;
    }

    if (projects.includes(projectName)) {
        showToast('A project with this name already exists.', 'error');
        return;
    }

    db.collection('projects').doc(projectName).set({ name: projectName }).then(() => {
      expandedProjects.add(projectName);
      saveExpanded();

      if (pendingNewProjectTasks.length > 0) {
        const batch = db.batch();
        pendingNewProjectTasks.forEach(taskName => {
          const newId = getNextTaskId();
          batch.set(db.collection('tasks').doc(newId), {
            id: newId,
            project: projectName,
            action: taskName,
            assignee: currentUser,
            priority: 'Medium',
            status: 'Pending',
            dueDate: '',
            notes: ''
          });
        });
        batch.commit().then(() => {
          showToast(`Created project with ${pendingNewProjectTasks.length} tasks!`, 'success');
          pendingNewProjectTasks = [];
          closeProjectModal();
        });
      } else {
        showToast('Project created successfully!', 'success');
        closeProjectModal();
      }
    });
  }

  // ─── Task Actions ───────────────────────────────────────────────────────────

  function cycleStatus(taskId) {
    const task = tasks.find(t => String(t.id) === String(taskId));
    if (!task) return;
    const idx = STATUS_CYCLE.indexOf(task.status);
    const newStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    
    db.collection('tasks').doc(String(taskId)).update({ status: newStatus }).then(() => {
      showToast(`Status → ${newStatus}`, 'info');
    });
  }

  function updateProjectStatsInDOM(projectName) {
    const safeName = projectName.replace(/"/g, '\\"');
    const accordion = dom.board.querySelector(`.project-accordion[data-project="${safeName}"]`);
    if (!accordion) return;
    
    const projectTasks = tasks.filter(t => t.project === projectName);
    const done = projectTasks.filter(t => t.status === 'Done').length;
    const pending = projectTasks.filter(t => t.status === 'Pending').length;
    const inProgress = projectTasks.filter(t => t.status === 'In Progress').length;
    const total = projectTasks.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    
    const fill = accordion.querySelector('.accordion-progress-fill');
    if (fill) fill.style.width = `${pct}%`;
    
    const text = accordion.querySelector('.accordion-progress-text');
    if (text) text.textContent = `${done}/${total} done`;
    
    const stats = accordion.querySelector('.accordion-stats');
    if (stats) {
      stats.innerHTML = '';
      if (done > 0)       stats.innerHTML += `<span class="mini-stat mini-stat-done">✓ ${done}</span>`;
      if (inProgress > 0) stats.innerHTML += `<span class="mini-stat mini-stat-progress">◐ ${inProgress}</span>`;
      if (pending > 0)    stats.innerHTML += `<span class="mini-stat mini-stat-pending">○ ${pending}</span>`;
    }
  }

  // ─── Project Options Modal ──────────────────────────────────────────────────

  function openProjectOptions(projectName) {
    dom.projectOptionsTitle.textContent = projectName;
    dom.projectOptionsModal.classList.add('is-active');
  }

  function closeProjectOptions() {
    dom.projectOptionsModal.classList.remove('is-active');
  }

  function initiateDelete(idOrName, type = 'task') {
    itemToDelete = idOrName;
    deleteType = type;
    
    if (type === 'project') {
      dom.confirmModalText.innerHTML = `Are you sure you want to delete the project <strong>"${escapeHtml(idOrName)}"</strong> and all its tasks?<br>This action cannot be undone.`;
      dom.confirmProjectInputContainer.style.display = 'block';
      dom.confirmProjectInput.value = '';
      dom.confirmDeleteBtn.disabled = true;
      dom.confirmDeleteBtn.style.opacity = '0.5';
      dom.confirmDeleteBtn.style.cursor = 'not-allowed';
    } else {
      const task = tasks.find(t => t.id === idOrName);
      if (!task) return;
      dom.confirmModalText.innerHTML = `Are you sure you want to delete <strong>"${escapeHtml(task.action)}"</strong>?<br>This action cannot be undone.`;
      dom.confirmProjectInputContainer.style.display = 'none';
      dom.confirmDeleteBtn.disabled = false;
      dom.confirmDeleteBtn.style.opacity = '1';
      dom.confirmDeleteBtn.style.cursor = 'pointer';
    }
    dom.confirmModal.classList.add('is-active');
    if (type === 'project') dom.confirmProjectInput.focus();
  }

  function closeConfirmModal() {
    dom.confirmModal.classList.remove('is-active');
    dom.confirmProjectInputContainer.style.display = 'none';
    dom.confirmDeleteBtn.disabled = false;
    dom.confirmDeleteBtn.style.opacity = '1';
    dom.confirmDeleteBtn.style.cursor = 'pointer';
    itemToDelete = null;
  }

  function confirmDeleteAction() {
    if (!itemToDelete) return;
    
    if (deleteType === 'project') {
      const proj = itemToDelete;
      const batch = db.batch();
      
      batch.delete(db.collection('projects').doc(proj));
      
      tasks.forEach(t => {
        if (t.project === proj) {
          batch.delete(db.collection('tasks').doc(String(t.id)));
        }
      });
      
      batch.commit().then(() => {
        expandedProjects.delete(proj);
        saveExpanded();
        showToast('Project deleted.', 'success');
      }).catch(err => console.error(err));
      
    } else {
      const taskId = itemToDelete;
      db.collection('tasks').doc(String(taskId)).delete().then(() => {
        showToast('Task deleted.', 'info');
      }).catch(err => console.error(err));
    }
    
    closeConfirmModal();
  }

  // ─── Edit Project Modal ─────────────────────────────────────────────────────

  function openEditProjectModal(projectName) {
    projectToEdit = projectName;
    dom.editProjectName.value = projectName;
    dom.editProjectModal.classList.add('is-active');
    dom.editProjectName.focus();
  }

  function closeEditProjectModal() {
    dom.editProjectModal.classList.remove('is-active');
    projectToEdit = null;
    dom.editProjectForm.reset();
  }

  function handleEditProjectSubmit(e) {
    e.preventDefault();
    if (!projectToEdit) return;
    
    const newName = dom.editProjectName.value.trim();
    if (!newName) return;
    
    if (newName !== projectToEdit) {
      if (projects.includes(newName)) {
        showToast('A project with this name already exists.', 'error');
        return;
      }
      
      const batch = db.batch();
      
      batch.set(db.collection('projects').doc(newName), { name: newName });
      batch.delete(db.collection('projects').doc(projectToEdit));
      
      tasks.forEach(t => {
        if (t.project === projectToEdit) {
          batch.update(db.collection('tasks').doc(String(t.id)), { project: newName });
        }
      });
      
      batch.commit().then(() => {
        if (expandedProjects.has(projectToEdit)) {
          expandedProjects.delete(projectToEdit);
          expandedProjects.add(newName);
          saveExpanded();
        }
        showToast(`Project renamed to ${newName}`, 'success');
        closeEditProjectModal();
      }).catch(err => {
        console.error(err);
        showToast('Failed to rename project', 'error');
      });
    } else {
      closeEditProjectModal();
    }
  }

  // ─── Toast ──────────────────────────────────────────────────────────────────

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
    dom.toastContainer.appendChild(toast);

    setTimeout(() => dismissToast(toast), TOAST_MS);
  }

  function dismissToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove());
  }

  // ─── Event Delegation ──────────────────────────────────────────────────────

  dom.board.addEventListener('click', (e) => {
    const toggle = e.target.closest('.task-status-toggle');
    if (toggle) {
      e.stopPropagation();
      cycleStatus(toggle.dataset.id);
      return;
    }

    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      e.stopPropagation();
      openTaskModal(editBtn.dataset.id);
      return;
    }

    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      e.stopPropagation();
      initiateDelete(deleteBtn.dataset.id);
      return;
    }

    const addInlineBtn = e.target.closest('.btn-add-task-inline');
    if (addInlineBtn) {
      e.stopPropagation();
      openTaskModal(null, addInlineBtn.dataset.project);
      return;
    }
  });

  // ─── Event Listeners ──────────────────────────────────────────────────────

  dom.modalClose.addEventListener('click', closeTaskModal);
  dom.cancelBtn.addEventListener('click', closeTaskModal);
  dom.taskModal.addEventListener('click', (e) => {
    if (e.target === dom.taskModal) closeTaskModal();
  });
  dom.taskForm.addEventListener('submit', handleTaskSubmit);

  dom.taskActionContainer.addEventListener('input', (e) => {
    if (editingId) return;
    if (e.target.classList.contains('task-action-input')) {
      const inputs = Array.from(dom.taskActionContainer.querySelectorAll('.task-action-input'));
      const lastInput = inputs[inputs.length - 1];
      if (lastInput.value.trim() !== '') {
        addBlankTaskInput();
      }
    }
  });

  dom.taskActionContainer.addEventListener('keydown', (e) => {
    if (editingId) return;
    if (e.target.classList.contains('task-action-input') && e.key === 'Enter') {
      e.preventDefault();
      const inputs = Array.from(dom.taskActionContainer.querySelectorAll('.task-action-input'));
      const currentIndex = inputs.indexOf(e.target);
      
      if (e.target.value.trim() !== '') {
        if (currentIndex < inputs.length - 1) {
          inputs[currentIndex + 1].focus();
        }
      } else {
        if (inputs.some(inp => inp.value.trim() !== '')) {
           dom.taskForm.requestSubmit();
        }
      }
    }
  });

  dom.projectModalClose.addEventListener('click', closeProjectModal);
  dom.projectCancelBtn.addEventListener('click', closeProjectModal);
  dom.projectModal.addEventListener('click', (e) => {
    if (e.target === dom.projectModal) closeProjectModal();
  });
  dom.projectForm.addEventListener('submit', handleProjectSubmit);
  
  dom.editProjectModalClose.addEventListener('click', closeEditProjectModal);
  dom.editProjectCancelBtn.addEventListener('click', closeEditProjectModal);
  dom.editProjectForm.addEventListener('submit', handleEditProjectSubmit);
  dom.editProjectDeleteBtn.addEventListener('click', () => {
    const proj = projectToEdit;
    closeEditProjectModal();
    initiateDelete(proj, 'project');
  });

  function addLongPressListener(button, onClick, onLongPress) {
    let timer;
    let isLongPress = false;
    
    const start = (e) => {
      if (e.type === 'mousedown' && e.button !== 0) return;
      isLongPress = false;
      timer = setTimeout(() => {
        isLongPress = true;
        onLongPress(e);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 600);
    };
    
    const cancel = () => {
      if (timer) clearTimeout(timer);
    };
    
    button.addEventListener('mousedown', start);
    button.addEventListener('touchstart', start, {passive: true});
    
    button.addEventListener('mouseleave', cancel);
    button.addEventListener('touchcancel', cancel);
    button.addEventListener('mouseup', cancel);
    button.addEventListener('touchend', cancel);
    
    button.addEventListener('click', (e) => {
      if (isLongPress) {
        e.preventDefault();
        e.stopPropagation();
      } else if (onClick) {
        onClick(e);
      }
    });
  }

  if (dom.importProjectBtn) {
    addLongPressListener(
      dom.importProjectBtn,
      () => dom.importFileInput.click(),
      () => exportSampleProject()
    );
  }

  if (dom.importFileInput) {
    dom.importFileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      e.target.value = ''; 

      const reader = new FileReader();
      reader.onload = function(evt) {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/);
        
        const parsedTasks = [];
        lines.forEach(line => {
          let clean = line.replace(/^[\s\-\*\.\d]+/, '').trim();
          if (clean) parsedTasks.push(clean);
        });

        if (parsedTasks.length === 0) {
          showToast('No readable tasks found in the file.', 'error');
          return;
        }

        const defaultName = file.name.replace(/\.[^/.]+$/, "");
        if (!dom.newProjectName.value.trim()) {
           dom.newProjectName.value = defaultName;
        }
        
        pendingNewProjectTasks = parsedTasks;
        showToast('File loaded! Review the name and click Create Project.', 'info');
      };
      reader.readAsText(file);
    });
  }

  if (dom.importTaskBtn) {
    addLongPressListener(
      dom.importTaskBtn,
      () => dom.importTaskFileInput.click(),
      () => {
        const projectName = dom.taskProject.value.trim();
        if (!projectName) {
          showToast('Select a project first to export.', 'error');
        } else {
          exportProject(projectName);
        }
      }
    );
  }

  if (dom.importTaskFileInput) {
    dom.importTaskFileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      e.target.value = '';

      const reader = new FileReader();
      reader.onload = function(evt) {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/);
        
        const parsedTasks = [];
        lines.forEach(line => {
          let clean = line.replace(/^[\s\-\*\.\d]+/, '').trim();
          if (clean) parsedTasks.push(clean);
        });

        if (parsedTasks.length === 0) {
          showToast('No readable tasks found in the file.', 'error');
          return;
        }
        
        const projectName = dom.taskProject.value.trim();
        if (!projectName) {
           showToast('Please select a project first.', 'error');
           return;
        }
        
        let newCount = 0;
        const batch = db.batch();
        parsedTasks.forEach(taskName => {
          const exists = tasks.some(t => t.project === projectName && t.action.toLowerCase() === taskName.toLowerCase());
          if (!exists) {
            const newId = getNextTaskId();
            batch.set(db.collection('tasks').doc(newId), {
              id: newId,
              project: projectName,
              action: taskName,
              assignee: currentUser,
              priority: 'Medium',
              status: 'Pending',
              dueDate: '',
              notes: ''
            });
            newCount++;
          }
        });
        
        if (newCount > 0) {
            expandedProjects.add(projectName);
            saveExpanded();
            batch.commit().then(() => {
              showToast(`Imported ${newCount} new task(s)!`, 'success');
            });
        } else {
            showToast('All tasks already exist in this project.', 'info');
        }
        
        closeTaskModal();
      };
      reader.readAsText(file);
    });
  }

  // Confirm Modal
  if (dom.confirmProjectInput) {
    dom.confirmProjectInput.addEventListener('input', (e) => {
      if (deleteType === 'project') {
        const isValid = e.target.value.trim().toLowerCase() === 'yes';
        dom.confirmDeleteBtn.disabled = !isValid;
        dom.confirmDeleteBtn.style.opacity = isValid ? '1' : '0.5';
        dom.confirmDeleteBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
      }
    });
  }

  dom.confirmCancelBtn.addEventListener('click', closeConfirmModal);
  dom.confirmDeleteBtn.addEventListener('click', confirmDeleteAction);
  dom.confirmModal.addEventListener('click', (e) => {
    if (e.target === dom.confirmModal) closeConfirmModal();
  });

  // Filters
  [dom.filterProject, dom.filterAssignee, dom.filterPriority, dom.filterStatus].forEach(el => {
    el.addEventListener('change', renderBoard);
  });

  dom.searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderBoard, DEBOUNCE_MS);
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.taskModal.classList.contains('is-active')) closeTaskModal();
      if (dom.projectModal.classList.contains('is-active')) closeProjectModal();
      if (dom.confirmModal.classList.contains('is-active')) closeConfirmModal();
      if (dom.projectOptionsModal.classList.contains('is-active')) closeProjectOptions();
      if (dom.userSelectModal.classList.contains('is-active')) dom.userSelectModal.classList.remove('is-active');
    }
  });

  // User Selection
  function initUser() {
    const savedUser = localStorage.getItem('todo_user');
    if (savedUser) {
      currentUser = savedUser;
      if (dom.currentUserDisplay) dom.currentUserDisplay.innerText = currentUser;
    } else {
      // If first time, show modal immediately without being dismissible
      if (dom.userSelectModal) {
        dom.userSelectModal.classList.add('is-active');
      }
    }
  }

  document.querySelectorAll('.user-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const newName = e.currentTarget.dataset.user;
      currentUser = newName;
      localStorage.setItem('todo_user', currentUser);
      if (dom.currentUserDisplay) dom.currentUserDisplay.innerText = currentUser;
      
      if (dom.userSelectModal) {
        dom.userSelectModal.classList.remove('is-active');
      }
      showToast(`Welcome ${currentUser}!`, 'success');
    });
  });

  if (dom.userProfileBtn) {
    dom.userProfileBtn.addEventListener('click', () => {
      if (dom.userSelectModal) {
        dom.userSelectModal.classList.add('is-active');
      }
    });
  }

  // Allow clicking background to close modal IF a user is already set
  if (dom.userSelectModal) {
    dom.userSelectModal.addEventListener('click', (e) => {
      if (e.target === dom.userSelectModal && currentUser) {
        dom.userSelectModal.classList.remove('is-active');
      }
    });
  }

  // ─── Init ───────────────────────────────────────────────────────────────────

  initUser();
  loadData();
  loadExpanded();
  populateFilters();
  renderBoard();

});
