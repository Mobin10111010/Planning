import { TaskManager } from './taskManager.js';
import { ChartManager } from './chartManager.js';
import { AchievementManager } from './achievementManager.js';
import { AIManager } from './aiManager.js';

export class App {
  constructor() {
    this.taskManager = new TaskManager();
    this.chartManager = new ChartManager();
    this.achievementManager = new AchievementManager();
    this.aiManager = new AIManager();
    
    this.initializeApp();
    this.editingTaskId = null;
    this.motivationalTimer = null;
    this.startMotivationalMessages();
    this.initializeReminders();
  }

  initializeApp() {
    this.setupEventListeners();
    this.loadInitialData();
    this.updateUI();
  }

  setupEventListeners() {
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskForm = document.getElementById('taskForm');
    const newWeekBtn = document.getElementById('newWeekBtn');
    const reminderForm = document.getElementById('reminderForm');
    
    addTaskBtn.addEventListener('click', () => this.showModal());
    taskForm.addEventListener('submit', (e) => this.handleTaskSubmit(e));
    newWeekBtn.addEventListener('click', () => this.handleNewWeek());
    reminderForm.addEventListener('submit', (e) => this.handleReminderSubmit(e, reminderForm.dataset.taskId));
  }

  async loadInitialData() {
    await Promise.all([
      this.taskManager.loadTasks(),
      this.achievementManager.loadAchievements()
    ]);
    
    this.chartManager.initializeCharts();
    this.updateUI();
  }

  showModal(type = 'task') {
    const modal = document.getElementById(type === 'reminder' ? 'reminderModal' : 'taskModal');
    modal.style.display = 'block';
  }

  showEditModal(taskId) {
    const task = this.taskManager.getTasks().find(t => t.id === taskId);
    if (!task) return;

    this.editingTaskId = taskId;
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const modalTitle = modal.querySelector('h3');
    const submitBtn = modal.querySelector('button[type="submit"]');

    modalTitle.textContent = 'Edit Task';
    submitBtn.textContent = 'Update Task';

    // Fill form with task data
    form.elements.title.value = task.title;
    form.elements.type.value = task.type;
    form.elements.priority.value = task.priority;
    form.elements.dueDate.value = task.dueDate.slice(0, 16); // Format datetime-local

    modal.style.display = 'block';
  }

  closeModal(type = 'task') {
    const modalId = type === 'prediction' ? 'predictionModal' : 
                   type === 'reminder' ? 'reminderModal' : 
                   'taskModal';
    const modal = document.getElementById(modalId);
    const form = type === 'reminder' ? document.getElementById('reminderForm') : 
                type === 'task' ? document.getElementById('taskForm') : 
                null;
    
    if (form) {
      const modalTitle = modal.querySelector('h3');
      const submitBtn = modal.querySelector('button[type="submit"]');

      if (type === 'task') {
        modalTitle.textContent = 'Add New Task';
        submitBtn.textContent = 'Add Task';
        this.editingTaskId = null;
      }
      form.reset();
    }
    
    modal.style.display = 'none';
  }

  async handleTaskSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const taskData = {
      title: formData.get('title'),
      type: formData.get('type'),
      priority: formData.get('priority'),
      dueDate: formData.get('dueDate'),
    };

    if (this.editingTaskId) {
      await this.taskManager.updateTask(this.editingTaskId, taskData);
    } else {
      await this.taskManager.addTask(taskData);
      // Get AI suggestions only for new tasks
      const suggestions = await this.aiManager.getTaskSuggestions(taskData);
    }
    
    this.updateUI();
    this.closeModal();
    e.target.reset();
  }

  async handleNewWeek() {
    if (confirm('Are you sure you want to start a new week? This will reset all task statuses.')) {
      await this.taskManager.startNewWeek();
      this.updateUI();
      
      // Show confirmation message
      const message = {
        message: "New week started! Ready for new achievements! ",
        theme: "success"
      };
      
      const popup = document.createElement('div');
      popup.className = `motivational-popup ${message.theme}`;
      popup.innerHTML = `
        <button class="close-btn" onclick="app.hideMotivationalMessage(this)">×</button>
        <p>${message.message}</p>
      `;
      
      document.body.appendChild(popup);
      
      setTimeout(() => {
        if (document.body.contains(popup)) {
          this.hideMotivationalMessage(popup.querySelector('.close-btn'));
        }
      }, 5000);
    }
  }

  updateUI() {
    requestAnimationFrame(() => {
      this.renderTasks();
      this.renderAchievements();
      this.chartManager.updateCharts(this.taskManager.getTaskStats());
    });
  }

  renderTasks() {
    const taskList = document.getElementById('taskList');
    const tasks = this.taskManager.getTasks();
    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    
    requestAnimationFrame(() => {
      taskList.innerHTML = tasks.map(task => `
        <div class="task-item" data-id="${task.id}">
          <div class="task-info">
            <h4>${task.title}</h4>
            <p>${task.type} - ${task.priority}</p>
            <p class="due-date">Due: ${new Date(task.dueDate).toLocaleString()}</p>
            
            <div class="weekly-task-grid">
              ${days.map((day, index) => {
                const status = task.weeklyStatus[index].status;
                const date = new Date(task.weeklyStatus[index].date);
                const isLocked = new Date() < date;
                
                return `
                  <div class="day-cell">
                    <div>${day}</div>
                    ${isLocked ? `
                      <button class="locked" disabled></button>
                    ` : `
                      <button 
                        onclick="app.handleDayStatus(event, '${task.id}', ${index}, 'complete')"
                        class="${status === 'complete' ? 'success' : ''}"
                        ${status ? 'disabled' : ''}>✓</button>
                      <button 
                        onclick="app.handleDayStatus(event, '${task.id}', ${index}, 'failed')"
                        class="${status === 'failed' ? 'fail' : ''}"
                        ${status ? 'disabled' : ''}>✗</button>
                      <button 
                        onclick="app.handleDayStatus(event, '${task.id}', ${index}, 'break')"
                        class="${status === 'break' ? 'break' : ''}"
                        ${status ? 'disabled' : ''}>⏸</button>
                    `}
                  </div>
                `;
              }).join('')}
            </div>

            <div class="reminder-list">
              ${this.taskManager.getReminders(task.id).map(reminder => `
                <div class="reminder-item">
                  <div class="reminder-info">
                    <div>${reminder.message}</div>
                    <div class="reminder-time">${new Date(reminder.time).toLocaleString()}</div>
                  </div>
                  <button onclick="app.handleTaskAction('${task.id}', 'deleteReminder', '${reminder.id}')" 
                          class="action-btn delete" title="Delete Reminder">
                    <span>🗑</span>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="task-actions">
            <button onclick="app.showReminderModal('${task.id}')" class="action-btn" title="Add Reminder">
              <span>🔔</span>
            </button>
            <button onclick="app.handleTaskAction('${task.id}', 'edit')" class="action-btn edit" title="Edit Task">
              <span>✎</span>
            </button>
            <button onclick="app.handleTaskAction('${task.id}', 'delete')" class="action-btn delete" title="Delete Task">
              <span>🗑</span>
            </button>
          </div>
        </div>
      `).join('');

      // Update level display immediately
      const levelInfo = this.taskManager.getLevel();
      document.querySelector('.level').textContent = `Level ${levelInfo.level}`;
      document.querySelector('.points').textContent = `${levelInfo.points} pts`;
    });
  }

  async handleDayStatus(event, taskId, dayIndex, status) {
    event.preventDefault();
    event.stopPropagation();
    
    // Immediate UI feedback
    const button = event.target;
    const cell = button.closest('.day-cell');
    const allButtons = cell.querySelectorAll('button');
    
    // Optimize by using classList manipulation directly
    allButtons.forEach(btn => {
      btn.classList.remove('success', 'fail', 'break');
      btn.disabled = true;
    });
    
    // Fast class addition
    button.classList.add(
      status === 'complete' ? 'success' : 
      status === 'failed' ? 'fail' : 
      'break'
    );

    // Update data asynchronously
    requestAnimationFrame(async () => {
      await this.taskManager.updateDayStatus(taskId, dayIndex, status);
      this.updateUI();
    });
  }

  renderAchievements() {
    const achievementsContainer = document.getElementById('achievements');
    const achievements = this.achievementManager.getAchievements();
    
    achievementsContainer.innerHTML = achievements.map(achievement => `
      <div class="achievement-item ${achievement.unlocked ? 'unlocked' : ''}">
        <div class="achievement-icon">${achievement.icon}</div>
        <h4>${achievement.title}</h4>
        <p>${achievement.description}</p>
      </div>
    `).join('');
  }

  async handleTaskAction(taskId, action, reminderId) {
    switch (action) {
      case 'edit':
        this.showEditModal(taskId);
        return;
      case 'delete':
        if (confirm('Are you sure you want to delete this task? This will reduce your points.')) {
          await this.taskManager.deleteTask(taskId);
          this.updateUI();
        }
        break;
      case 'deleteReminder':
        if (confirm('Are you sure you want to delete this reminder?')) {
          await this.taskManager.deleteReminder(taskId, reminderId);
          this.updateUI();
        }
        break;
    }
  }

  initializeReminders() {
    // Request notification permission
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }

  async handleReminderSubmit(e, taskId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const reminder = await this.taskManager.addReminder(
      taskId,
      formData.get('reminderTime'),
      formData.get('message')
    );

    this.closeModal('reminder');
    e.target.reset();
    
    // Show confirmation message
    const popup = document.createElement('div');
    popup.className = 'motivational-popup success';
    popup.innerHTML = `
      <button class="close-btn" onclick="app.hideMotivationalMessage(this)">×</button>
      <p>Reminder set successfully!</p>
    `;
    
    document.body.appendChild(popup);
    setTimeout(() => {
      if (document.body.contains(popup)) {
        this.hideMotivationalMessage(popup.querySelector('.close-btn'));
      }
    }, 3000);
  }

  showReminderModal(taskId) {
    const modal = document.getElementById('reminderModal');
    const form = document.getElementById('reminderForm');
    form.dataset.taskId = taskId;
    modal.style.display = 'block';
  }

  startMotivationalMessages() {
    // Show first message after a short delay
    setTimeout(() => this.showMotivationalMessage(), 5000);
    
    // Set up periodic messages
    this.motivationalTimer = setInterval(() => {
      this.showMotivationalMessage();
    }, 60000); // Every minute
  }

  async showMotivationalMessage() {
    const message = await this.aiManager.getMotivationalMessage();
    
    // Remove any existing popup
    const existingPopup = document.querySelector('.motivational-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create new popup
    const popup = document.createElement('div');
    popup.className = `motivational-popup ${message.theme}`;
    popup.innerHTML = `
      <button class="close-btn" onclick="app.hideMotivationalMessage(this)">×</button>
      <p>${message.message}</p>
    `;

    document.body.appendChild(popup);

    // Auto-hide after 10 seconds if not closed manually
    setTimeout(() => {
      if (document.body.contains(popup)) {
        this.hideMotivationalMessage(popup.querySelector('.close-btn'));
      }
    }, 10000);
  }

  hideMotivationalMessage(closeBtn) {
    const popup = closeBtn.closest('.motivational-popup');
    popup.classList.add('hiding');
    setTimeout(() => {
      if (document.body.contains(popup)) {
        popup.remove();
      }
    }, 300);
  }

  hideReminderMessage(closeBtn) {
    const popup = closeBtn.closest('.reminder-popup');
    popup.classList.add('hiding');
    setTimeout(() => {
      if (document.body.contains(popup)) {
        popup.remove();
      }
    }, 300);
  }

  async showPredictionModal(taskId = null) {
    const modal = document.getElementById('predictionModal');
    modal.style.display = 'block';
    
    // Show loading state immediately
    const content = modal.querySelector('.prediction-content');
    content.innerHTML = `
      <div class="loading-spinner">
        <svg viewBox="0 0 50 50" class="spinner">
          <circle cx="25" cy="25" r="20" fill="none" stroke="#4a90e2" stroke-width="5"></circle>
        </svg>
      </div>
    `;

    // Setup touch handling
    this.setupPredictionSwipe(modal);

    // Fetch data asynchronously
    requestAnimationFrame(async () => {
      const stats = await this.taskManager.getPredictionStats();
      
      if (!stats) {
        content.innerHTML = '<p>Not enough data for predictions yet. Complete some tasks first!</p>';
        return;
      }

      let prediction = null;
      if (taskId) {
        const task = this.taskManager.getTasks().find(t => t.id === taskId);
        if (task) {
          prediction = await this.aiManager.getTaskPrediction(task);
        }
      }

      // Enhanced percentage display with clear visuals
      content.innerHTML = `
        <div class="prediction-container">
          <div class="prediction-stats animate-in">
            <div class="prediction-meter">
              <svg viewBox="0 0 100 50" class="gauge">
                <path d="M10,45 A 35 35 0 1 1 90,45" fill="none" stroke="#ddd" stroke-width="10"/>
                <path class="gauge-progress" d="M10,45 A 35 35 0 1 1 90,45" fill="none" stroke="#4a90e2" 
                      stroke-width="10" stroke-dasharray="0, 100"/>
                <text x="50" y="45" text-anchor="middle" class="percentage">0%</text>
              </svg>
            </div>
            
            <div class="prediction-details">
              <h4>Success Rate Analysis</h4>
              <div class="stat-item animate-fade percentage-bar">
                <span>Base Success Rate:</span>
                <div class="bar-container">
                  <div class="bar" style="width: ${stats.overallSuccessRate}%"></div>
                  <span class="bar-label">${stats.overallSuccessRate}%</span>
                </div>
              </div>
              <div class="stat-item animate-fade percentage-bar" style="animation-delay: 0.1s">
                <span>Level Bonus:</span>
                <div class="bar-container">
                  <div class="bar bonus" style="width: ${stats.levelBonus}%"></div>
                  <span class="bar-label">+${stats.levelBonus}%</span>
                </div>
              </div>
              <div class="stat-item animate-fade percentage-bar" style="animation-delay: 0.2s">
                <span>Consistency Bonus:</span>
                <div class="bar-container">
                  <div class="bar bonus" style="width: ${stats.consistencyBonus}%"></div>
                  <span class="bar-label">+${stats.consistencyBonus}%</span>
                </div>
              </div>
              <div class="stat-item total animate-fade percentage-bar" style="animation-delay: 0.3s">
                <span>Adjusted Success Rate:</span>
                <div class="bar-container">
                  <div class="bar total" style="width: ${stats.adjustedSuccessRate}%"></div>
                  <span class="bar-label">${stats.adjustedSuccessRate}%</span>
                </div>
              </div>
            </div>
          </div>
          
          ${prediction ? `
            <div class="task-prediction animate-in" style="animation-delay: 0.4s">
              <h4>Specific Task Analysis</h4>
              <div class="prediction-breakdown">
                <div class="stat-item percentage-bar">
                  <span>Predicted Success Rate:</span>
                  <div class="bar-container">
                    <div class="bar" style="width: ${prediction.successRate}%"></div>
                    <span class="bar-label">${prediction.successRate}%</span>
                  </div>
                </div>
                <div class="stat-item percentage-bar">
                  <span>Confidence Level:</span>
                  <div class="bar-container">
                    <div class="bar confidence" style="width: ${prediction.confidence}%"></div>
                    <span class="bar-label">${prediction.confidence}%</span>
                  </div>
                </div>
              </div>
              
              <div class="factors">
                <h5>Key Factors:</h5>
                <ul>
                  ${prediction.factors.map((factor, i) => 
                    `<li style="animation-delay: ${0.5 + i * 0.1}s" class="animate-fade">${factor}</li>`
                  ).join('')}
                </ul>
              </div>
              
              <div class="recommendations">
                <h5>Recommendations:</h5>
                <ul>
                  ${prediction.recommendations.map((rec, i) => 
                    `<li style="animation-delay: ${0.7 + i * 0.1}s" class="animate-fade">${rec}</li>`
                  ).join('')}
                </ul>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="swipe-indicator">
          <div class="swipe-dot active"></div>
          ${prediction ? '<div class="swipe-dot"></div>' : ''}
        </div>

        <div class="swipe-arrow prev" style="display: none;">←</div>
        <div class="swipe-arrow next" ${prediction ? '' : 'style="display: none;"'}>→</div>
      `;

      // Animate gauge after content is added
      requestAnimationFrame(() => {
        const gauge = content.querySelector('.gauge-progress');
        const percentage = content.querySelector('.percentage');
        if (gauge && percentage) {
          gauge.style.strokeDasharray = `${stats.adjustedSuccessRate}, 100`;
          percentage.textContent = `${stats.adjustedSuccessRate}%`;
        }
      });
    });
  }

  setupPredictionSwipe(modal) {
    const content = modal.querySelector('.prediction-content');
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let currentPage = 0;

    const handleStart = (e) => {
      isDragging = true;
      startX = e.type === 'mousedown' ? e.pageX : e.touches[0].pageX;
      currentX = startX;
      
      content.style.transition = 'none';
      content.style.cursor = 'grabbing';
    };

    const handleMove = (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      currentX = e.type === 'mousemove' ? e.pageX : e.touches[0].pageX;
      const diff = currentX - startX;
      
      // Only allow swipe if there's a second page
      if (content.querySelector('.task-prediction')) {
        content.style.transform = `translateX(${-currentPage * 100 + (diff / content.offsetWidth) * 100}%)`;
      }
    };

    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      
      const diff = currentX - startX;
      const threshold = content.offsetWidth * 0.2; // 20% threshold
      
      content.style.transition = 'transform 0.3s ease-out';
      content.style.cursor = '';
      
      if (Math.abs(diff) > threshold) {
        if (diff > 0 && currentPage > 0) {
          currentPage--;
        } else if (diff < 0 && currentPage === 0 && content.querySelector('.task-prediction')) {
          currentPage++;
        }
      }
      
      content.style.transform = `translateX(${-currentPage * 100}%)`;
      
      // Update indicators
      const dots = modal.querySelectorAll('.swipe-dot');
      dots.forEach((dot, i) => dot.classList.toggle('active', i === currentPage));
      
      // Update arrows
      const prevArrow = modal.querySelector('.swipe-arrow.prev');
      const nextArrow = modal.querySelector('.swipe-arrow.next');
      if (prevArrow && nextArrow) {
        prevArrow.style.display = currentPage === 0 ? 'none' : '';
        nextArrow.style.display = currentPage === 1 || !content.querySelector('.task-prediction') ? 'none' : '';
      }
    };

    // Touch events
    content.addEventListener('touchstart', handleStart, { passive: true });
    content.addEventListener('touchmove', handleMove, { passive: false });
    content.addEventListener('touchend', handleEnd);

    // Mouse events for desktop testing
    content.addEventListener('mousedown', handleStart);
    content.addEventListener('mousemove', handleMove);
    content.addEventListener('mouseup', handleEnd);
    content.addEventListener('mouseleave', handleEnd);

    // Arrow click handlers
    modal.querySelector('.swipe-arrow.prev')?.addEventListener('click', () => {
      if (currentPage > 0) {
        currentPage--;
        content.style.transition = 'transform 0.3s ease-out';
        content.style.transform = `translateX(${-currentPage * 100}%)`;
        
        // Update indicators
        const dots = modal.querySelectorAll('.swipe-dot');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === currentPage));
        
        // Update arrows
        modal.querySelector('.swipe-arrow.prev').style.display = currentPage === 0 ? 'none' : '';
        modal.querySelector('.swipe-arrow.next').style.display = '';
      }
    });

    modal.querySelector('.swipe-arrow.next')?.addEventListener('click', () => {
      if (content.querySelector('.task-prediction') && currentPage === 0) {
        currentPage++;
        content.style.transition = 'transform 0.3s ease-out';
        content.style.transform = `translateX(${-currentPage * 100}%)`;
        
        // Update indicators
        const dots = modal.querySelectorAll('.swipe-dot');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === currentPage));
        
        // Update arrows
        modal.querySelector('.swipe-arrow.prev').style.display = '';
        modal.querySelector('.swipe-arrow.next').style.display = 'none';
      }
    });
  }

  cleanup() {
    if (this.motivationalTimer) {
      clearInterval(this.motivationalTimer);
    }
    this.taskManager.cleanup();
  }
}

// Initialize the app
const app = new App();

// Export for global access
window.app = app;
window.closeModal = () => app.closeModal();

// Add cleanup on page unload
window.addEventListener('unload', () => {
  if (window.app) {
    window.app.cleanup();
  }
});