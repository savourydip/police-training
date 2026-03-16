let currentView = 'fto';
let isFTO = false;
let currentCadetData = null;
let allRecords = [];
let config = null;
let resourceName = null;
let isFirstOpen = true;

// Job grade mapping
const jobGradeMap = {
    0: 'Cadet',
    10: 'Officer',
    20: 'Corporal',
    30: 'Sergeant',
    40: 'Lieutenant',
    50: 'Ass Chief',
    60: 'Chief'
};

function getJobGradeTitle(gradeLevel) {
    return jobGradeMap[gradeLevel] || 'Officer';
}

// Listen for NUI messages
window.addEventListener('message', (event) => {
    const data = event.data;
    
    switch(data.action) {
        case 'open':
            openUI(data);
            break;
        case 'loadRecords':
            loadRecords(data.records);
            break;
        case 'loadMyRecord':
            loadMyRecord(data.record);
            break;
    }
});

// Open the UI
function openUI(data) {

    
    isFTO = data.isFTO;
    config = data.config;
    resourceName = data.resourceName || 'police-training';
    
    // Store player data for later use
    window.playerData = data.playerData;
    
    // Show loading screen only on first usage
    document.getElementById('app').classList.remove('hidden');
    const loadingScreen = document.getElementById('loadingScreen');
    
    if (isFirstOpen) {
        loadingScreen.classList.remove('hidden');
        
        // Display player name and rank in loading screen
        const rankTitle = getJobGradeTitle(data.playerData.jobGrade);
        document.getElementById('loadingName').textContent = `${rankTitle} ${data.playerData.name}`;
        
        // Hide loading screen after 7 seconds
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            
            // After fade out animation completes, show main content
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                
                // Show appropriate view
                if (isFTO) {
                    document.getElementById('ftoView').classList.remove('hidden');
                    document.getElementById('cadetView').classList.add('hidden');
                    currentView = 'fto';
                } else {
                    document.getElementById('ftoView').classList.add('hidden');
                    document.getElementById('cadetView').classList.remove('hidden');
                    currentView = 'cadet';
                }
            }, 800); // Match the fade-out animation duration
        }, 7000); // Show loading screen for 7 seconds
        
        // Mark that first open is complete
        isFirstOpen = false;
    } else {
        // Skip loading screen on subsequent opens
        loadingScreen.classList.add('hidden');
        
        // Show appropriate view immediately
        if (isFTO) {
            document.getElementById('ftoView').classList.remove('hidden');
            document.getElementById('cadetView').classList.add('hidden');
            currentView = 'fto';
        } else {
            document.getElementById('ftoView').classList.add('hidden');
            document.getElementById('cadetView').classList.remove('hidden');
            currentView = 'cadet';
        }
    }
}

// Close UI
function closeUI() {
    document.getElementById('app').classList.add('hidden');
    fetch(`https://${resourceName}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    }).catch(error => {
    });
}

// Load all training records (FTO view)
function loadRecords(records) {
    allRecords = records || [];
    renderCadetCards(allRecords);
}

// Render cadet cards
function renderCadetCards(records) {
    const grid = document.getElementById('cadetsGrid');
    
    if (!records || records.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Cadets in Training</h3>
                <p>Add a new cadet to get started</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = records.map(record => {
        const trainingData = JSON.parse(record.training_data);
        const progress = calculateProgress(trainingData);
        const statusClass = record.completed ? 'completed' : 'in-progress';
        const statusText = record.completed ? 'Completed' : 'In Progress';
        
        return `
            <div class="cadet-card" onclick="openCadetModal('${record.citizen_id}')">
                <div class="cadet-header">
                    <div>
                        <div class="cadet-name">${record.player_name}</div>
                        <div class="cadet-id">${record.citizen_id}</div>
                    </div>
                    <div class="status-badge ${statusClass}">${statusText}</div>
                </div>
                <div class="cadet-stats">
                    <div class="stat">
                        <span class="stat-label">Progress</span>
                        <span class="stat-value">${progress}%</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">FTO</span>
                        <span class="stat-value">${record.fto_name.split(' ')[0]}</span>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Calculate progress percentage
function calculateProgress(trainingData) {
    if (!trainingData || !trainingData.phases) return 0;
    
    let totalSections = 0;
    let completedSections = 0;
    
    trainingData.phases.forEach(phase => {
        Object.values(phase.sections).forEach(section => {
            totalSections++;
            if (section.completed) completedSections++;
        });
    });
    
    return totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
}

// Open cadet detail modal
async function openCadetModal(citizenId) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`https://${resourceName}/getCadetDetails`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ citizenId }),
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
            alert('Failed to load cadet details. Please try again.');
            return;
        }
        
        const record = await response.json();
        if (!record) return;
    
    currentCadetData = record;
    
    // Set modal header info
    document.getElementById('modalCadetName').textContent = record.player_name;
    document.getElementById('modalCitizenId').textContent = record.citizen_id;
    document.getElementById('modalFTO').textContent = record.fto_name;
    document.getElementById('modalStarted').textContent = formatDate(record.created_at);
    document.getElementById('modalStatus').textContent = record.completed ? 'Completed' : 'In Progress';
    
    // Render phases
    renderModalPhases(JSON.parse(record.training_data));
    
    // Render comments
    renderComments(record.comments);
    
    // Render exam results
    renderExamResults(record);
    
        // Show modal
        document.getElementById('cadetModal').classList.remove('hidden');
    } catch (error) {
        alert('Error loading cadet details. Please try again.');
    }
}

// Render phases in modal
function renderModalPhases(trainingData) {
    const container = document.getElementById('modalPhases');
    
    container.innerHTML = trainingData.phases.map((phase, phaseIndex) => {
        // Defensive: skip phases that don't have a config (e.g., old data with extra phases)
        if (!config.phases[phaseIndex]) return '';
        const sectionsHTML = Object.entries(phase.sections).map(([sectionId, sectionData]) => {
            const sectionConfig = config.phases[phaseIndex].sections.find(s => s.id === sectionId);
            if (!sectionConfig) return '';
            if (sectionConfig.type === 'checkbox') {
                return `
                    <div class="section-item">
                        <span class="section-label">${sectionConfig.label}</span>
                        <div class="section-controls">
                            <div class="checkbox-wrapper">
                                <input type="checkbox" 
                                    ${sectionData.completed ? 'checked' : ''}
                                    onchange="updateSection(${phaseIndex}, '${sectionId}', this.checked, null)">
                            </div>
                        </div>
                    </div>
                `;
            } else if (sectionConfig.type === 'callsign') {
                return `
                    <div class="section-item">
                        <span class="section-label">${sectionConfig.label}</span>
                        <div class="section-controls">
                            <input type="text" 
                                class="callsign-input" 
                                placeholder="Callsign"
                                value="${sectionData.callsign || ''}"
                                onchange="updateSection(${phaseIndex}, '${sectionId}', null, this.value)">
                            ${sectionData.completed ? '<i class="fas fa-check-circle completed-icon"></i>' : ''}
                        </div>
                    </div>
                `;
            }
        }).join('');
        return `
            <div class="phase-card">
                <div class="phase-header">
                    <div class="phase-title">${phase.name}</div>
                </div>
                <div class="phase-body">
                    ${sectionsHTML}
                </div>
            </div>
        `;
    }).join('');
}

// Update section progress
function updateSection(phaseIndex, sectionId, checked, callsign) {
    if (!currentCadetData) return;
    
    const trainingData = JSON.parse(currentCadetData.training_data);
    const section = trainingData.phases[phaseIndex].sections[sectionId];
    
    if (checked !== null) {
        section.completed = checked;
    }
    
    if (callsign !== null) {
        section.callsign = callsign;
        section.completed = callsign.length > 0;
    }
    
    section.timestamp = new Date().toISOString();
    
    // Update in database
    fetch(`https://${resourceName}/updateProgress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            citizenId: currentCadetData.citizen_id,
            trainingData: trainingData
        })
    }).catch(error => {
    });
    
    // Update current data
    currentCadetData.training_data = JSON.stringify(trainingData);
    
    // Re-render
    renderModalPhases(trainingData);
}

// Render comments
function renderComments(commentsJSON) {
    const container = document.getElementById('commentsList');
    
    const comments = commentsJSON ? JSON.parse(commentsJSON) : [];
    
    if (comments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h3>No Comments Yet</h3>
                <p>Add a comment to track this cadet's progress</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = comments.reverse().map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-author">${comment.fto}</span>
                <span class="comment-date">${formatDate(comment.timestamp)}</span>
            </div>
            <div class="comment-text">${comment.comment}</div>
        </div>
    `).join('');
}

// Render exam results
function renderExamResults(record) {
    const container = document.getElementById('examResults');
    
    if (!record.exam_score) {
        container.innerHTML = `
            <div class="exam-not-taken">
                <div class="empty-state">
                    <i class="fas fa-graduation-cap"></i>
                    <h3>No Exam Taken</h3>
                    <p>The cadet hasn't taken the final exam yet</p>
                </div>
                <button class="btn-primary" onclick="openExamForCadet()" style="margin-top: 20px;">
                    <i class="fas fa-play-circle"></i>
                    Start Exam
                </button>
            </div>
        `;
        return;
    }
    
    // Check if exam was passed - compare score to passing score
    const passingScore = parseInt(config.passingScore) || 80;
    const passed = parseInt(record.exam_score) >= passingScore;
    const scoreClass = passed ? 'passed' : 'failed';
    
    
    container.innerHTML = `
        <div class="exam-score ${scoreClass}">${record.exam_score}%</div>
        <div class="exam-message">${passed ? 'Exam Passed!' : 'Exam Failed'}</div>
        <div class="exam-submessage">
            ${passed ? 
                'This cadet has successfully completed the final exam.' : 
                `This cadet needs ${passingScore}% to pass. They can retake the exam.`
            }
        </div>
        ${!passed ? `
            <button class="btn-primary" onclick="openExamForCadet()" style="margin-top: 20px;">
                <i class="fas fa-redo"></i>
                Retake Exam
            </button>
        ` : ''}
    `;
}

// Load cadet's own record
function loadMyRecord(record) {
    
    if (!record) {
        document.querySelector('.cadet-dashboard').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-info-circle"></i>
                <h3>Not in Training Program</h3>
                <p>You are not currently enrolled in the training program</p>
            </div>
        `;
        return;
    }
    
    const trainingData = JSON.parse(record.training_data);
    const progress = calculateProgress(trainingData);
    
    document.getElementById('cadetProgress').textContent = progress + '%';
    document.getElementById('cadetFTO').textContent = record.fto_name.split(' ')[0];
    
    renderCadetPhases(trainingData);
    
    // Show exam button if all phases complete
    if (progress === 100 && !record.exam_passed) {
        document.getElementById('cadetExamSection').style.display = 'block';
    } else {
        document.getElementById('cadetExamSection').style.display = 'none';
    }
}

// Render phases for cadet view
function renderCadetPhases(trainingData) {
    const container = document.getElementById('cadetPhases');
    
    container.innerHTML = trainingData.phases.map((phase, phaseIndex) => {
        // Defensive: skip phases that don't have a config (e.g., old data with extra phases)
        if (!config.phases[phaseIndex]) return '';
        const sectionsHTML = Object.entries(phase.sections).map(([sectionId, sectionData]) => {
            const sectionConfig = config.phases[phaseIndex].sections.find(s => s.id === sectionId);
            if (!sectionConfig) return '';
            const completedIcon = sectionData.completed ? 
                '<i class="fas fa-check-circle completed-icon"></i>' : 
                '<i class="fas fa-circle" style="color: var(--text-tertiary);"></i>';
            return `
                <div class="section-item">
                    <span class="section-label">${sectionConfig.label}</span>
                    <div class="section-controls">
                        ${sectionData.callsign ? `<span class="callsign-input" disabled>${sectionData.callsign}</span>` : ''}
                        ${completedIcon}
                    </div>
                </div>
            `;
        }).join('');
        return `
            <div class="phase-card">
                <div class="phase-header">
                    <div class="phase-title">${phase.name}</div>
                </div>
                <div class="phase-body">
                    ${sectionsHTML}
                </div>
            </div>
        `;
    }).join('');
}

// Open exam for a cadet from the modal
function openExamForCadet() {
    if (!config || !config.examQuestions || config.examQuestions.length === 0) {
        alert('Exam questions are not available');
        return;
    }
    
    document.getElementById('examPassingScore').textContent = config.passingScore;
    
    const questionsHTML = config.examQuestions.map((q, index) => {
        return `
        <div class="question-item">
            <div class="question-text">${index + 1}. ${q.question}</div>
            ${q.answers.map((answer, answerIndex) => `
                <div class="answer-option" onclick="selectAnswer(${index}, ${answerIndex})">
                    <input type="radio" name="q${index}" id="q${index}_${answerIndex}">
                    <label class="answer-label" for="q${index}_${answerIndex}">${answer}</label>
                </div>
            `).join('')}
        </div>
    `;
    }).join('');
    
    const examQuestionsElement = document.getElementById('examQuestions');
    if (examQuestionsElement) {
        examQuestionsElement.innerHTML = questionsHTML;
    }
    
    // Close the cadet modal and open exam modal
    document.getElementById('cadetModal').classList.add('hidden');
    document.getElementById('examModal').classList.remove('hidden');
}

// Open exam
function openExam() {
    
    if (!config || !config.examQuestions || config.examQuestions.length === 0) {
        alert('Exam questions are not available');
        return;
    }
    
    document.getElementById('examPassingScore').textContent = config.passingScore;
    
    const questionsHTML = config.examQuestions.map((q, index) => {
        return `
        <div class="question-item">
            <div class="question-text">${index + 1}. ${q.question}</div>
            ${q.answers.map((answer, answerIndex) => `
                <div class="answer-option" onclick="selectAnswer(${index}, ${answerIndex})">
                    <input type="radio" name="q${index}" id="q${index}_${answerIndex}">
                    <label class="answer-label" for="q${index}_${answerIndex}">${answer}</label>
                </div>
            `).join('')}
        </div>
    `;
    }).join('');
    
    const examQuestionsElement = document.getElementById('examQuestions');
    
    if (examQuestionsElement) {
        examQuestionsElement.innerHTML = questionsHTML;
    }
    
    document.getElementById('examModal').classList.remove('hidden');
}

// Select answer
function selectAnswer(questionIndex, answerIndex) {
    const options = document.querySelectorAll(`[name="q${questionIndex}"]`).length;
    
    for (let i = 0; i < options; i++) {
        const option = document.getElementById(`q${questionIndex}_${i}`);
        const parent = option.parentElement;
        
        if (i === answerIndex) {
            option.checked = true;
            parent.classList.add('selected');
        } else {
            option.checked = false;
            parent.classList.remove('selected');
        }
    }
}

// Submit exam
async function submitExam() {
    try {
    const answers = [];
    
    for (let i = 0; i < config.examQuestions.length; i++) {
        const selected = document.querySelector(`[name="q${i}"]:checked`);
        if (selected) {
            const answerIndex = parseInt(selected.id.split('_')[1]);
            answers.push(answerIndex + 1); // Convert to 1-based
        } else {
            answers.push(null);
        }
    }
    
    // Check if all questions answered
    if (answers.includes(null)) {
        alert('Please answer all questions before submitting');
        return;
    }
    
    // Calculate score
    let correct = 0;
    config.examQuestions.forEach((q, index) => {
        if (answers[index] === q.correct) {
            correct++;
        }
    });
    
        const score = Math.round((correct / config.examQuestions.length) * 100);
        const passingScore = parseInt(config.passingScore) || 80;
        const passed = score >= passingScore;
        
        
        // Get player's citizen ID from somewhere (you might need to store this)
        const playerData = window.playerData;
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`https://${resourceName}/submitExam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                citizenId: playerData.citizenId,
                score: score,
                passed: passed
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
            alert('Failed to submit exam. Please try again.');
            return;
        }
        
        // If we came from a cadet modal, refresh it
        if (currentCadetData) {
            closeExamModal();
            setTimeout(() => openCadetModal(currentCadetData.citizen_id), 300);
        } else {
            closeExamModal();
        }
    } catch (error) {
        alert('Error submitting exam. Please try again.');
    }
}

// Add comment
async function addComment() {
    try {
        const input = document.getElementById('commentInput');
        const comment = input.value.trim();
        
        if (!comment) return;
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`https://${resourceName}/addComment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                citizenId: currentCadetData.citizen_id,
                comment: comment
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
            alert('Failed to add comment. Please try again.');
            return;
        }
        
        input.value = '';
        
        // Refresh modal
        setTimeout(() => openCadetModal(currentCadetData.citizen_id), 500);
    } catch (error) {
        alert('Error adding comment. Please try again.');
    }
}

// Complete training
async function completeTraining() {
    showConfirmation(
        'Mark Training as Completed',
        'Are you sure you want to mark this training as completed? This action cannot be undone.',
        async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(`https://${resourceName}/completeTraining`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        citizenId: currentCadetData.citizen_id
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeout);
                
                if (!response.ok) {
                    alert('Failed to complete training. Please try again.');
                    return;
                }
                
                closeConfirmation();
                closeCadetModal();
            } catch (error) {
                alert('Error completing training. Please try again.');
            }
        }
    );
}

// Delete record
async function deleteRecord() {
    showConfirmation(
        'Delete Training Record',
        'Are you sure you want to delete this training record? This action cannot be undone and all data will be permanently lost.',
        async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(`https://${resourceName}/deleteRecord`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        citizenId: currentCadetData.citizen_id
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeout);
                
                if (!response.ok) {
                    alert('Failed to delete record. Please try again.');
                    return;
                }
                
                closeConfirmation();
                closeCadetModal();
            } catch (error) {
                alert('Error deleting record. Please try again.');
            }
        }
    );
}

// Add cadet
async function addCadet() {
    try {
        const citizenId = document.getElementById('citizenIdInput').value.trim().toUpperCase();
        
        if (!citizenId) {
            alert('Please enter a Citizen ID');
            return;
        }
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`https://${resourceName}/addCadet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ citizenId }),
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
            alert('Failed to add cadet. Please try again.');
            return;
        }
        
        document.getElementById('citizenIdInput').value = '';
        
        // Switch to cadets tab
        switchTab('cadets');
    } catch (error) {
        alert('Error adding cadet. Please try again.');
    }
}

// Close modals
function closeCadetModal() {
    document.getElementById('cadetModal').classList.add('hidden');
    currentCadetData = null;
}

function closeExamModal() {
    document.getElementById('examModal').classList.add('hidden');
    
    // If we came from a cadet modal, reopen it
    if (currentCadetData) {
        document.getElementById('cadetModal').classList.remove('hidden');
    }
}

function closeConfirmation() {
    document.getElementById('confirmationModal').classList.add('hidden');
}

// Show confirmation modal
let confirmationCallback = null;

function showConfirmation(title, message, callback) {
    confirmationCallback = callback;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmationModal').classList.remove('hidden');
}

// Handle confirmation action
function handleConfirmAction() {
    if (confirmationCallback) {
        confirmationCallback();
        confirmationCallback = null;
    }
}

// Switch tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Switch modal tabs
function switchModalTab(tabName) {
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.modal-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelector(`[data-modal-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName + 'Content').classList.add('active');
}

// Search cadets
function searchCadets(query) {
    const filtered = allRecords.filter(record => {
        return record.player_name.toLowerCase().includes(query.toLowerCase()) ||
               record.citizen_id.toLowerCase().includes(query.toLowerCase());
    });
    
    renderCadetCards(filtered);
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function GetParentResourceName() {
    return window.location.hostname === 'nui-frame-overlays' ? 
        'police-training' : 
        window.location.pathname.split('/')[1];
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Close button
    document.getElementById('closeBtn').addEventListener('click', closeUI);
    
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Modal tab navigation
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchModalTab(btn.dataset.modalTab));
    });
    
    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeCadetModal);
    
    // Add cadet
    document.getElementById('addCadetBtn').addEventListener('click', addCadet);
    
    // Comments
    document.getElementById('addCommentBtn').addEventListener('click', addComment);
    
    // Complete/Delete
    document.getElementById('completeTrainingBtn').addEventListener('click', completeTraining);
    document.getElementById('deleteRecordBtn').addEventListener('click', deleteRecord);
    
    // Exam
    const startExamBtn = document.getElementById('startExamBtn');
    if (startExamBtn) {
        startExamBtn.addEventListener('click', () => {
            openExam();
        });
    }
    document.getElementById('cancelExamBtn').addEventListener('click', closeExamModal);
    document.getElementById('submitExamBtn').addEventListener('click', submitExam);
    
    // Search
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        searchCadets(e.target.value);
    });
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!document.getElementById('cadetModal').classList.contains('hidden')) {
                closeCadetModal();
            } else if (!document.getElementById('examModal').classList.contains('hidden')) {
                closeExamModal();
            } else {
                closeUI();
            }
        }
    });
    
    // Click outside modal to close
    document.getElementById('cadetModal').addEventListener('click', (e) => {
        if (e.target.id === 'cadetModal') closeCadetModal();
    });
    
    document.getElementById('examModal').addEventListener('click', (e) => {
        if (e.target.id === 'examModal') closeExamModal();
    });
    
    // Confirmation modal
    document.getElementById('confirmationModal').addEventListener('click', (e) => {
        if (e.target.id === 'confirmationModal') closeConfirmation();
    });
    
    document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirmation);
    document.getElementById('confirmActionBtn').addEventListener('click', handleConfirmAction);
});
