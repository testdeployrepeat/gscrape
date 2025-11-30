let scrapedData = [];
let history = { searches: [] };
let bulkQueries = [];
let isBulkMode = false;
let isScrapingActive = false;
let currentBulkOperation = null; // Track current bulk operation
let startTime = null;
let timerInterval = null;

// DOM Elements
const bulkModeToggle = document.getElementById('bulkModeToggle');
const singleMode = document.getElementById('singleMode');
const bulkMode = document.getElementById('bulkMode');

const nicheInput = document.getElementById('niche');
const locationInput = document.getElementById('location');

const bulkNicheInput = document.getElementById('bulkNiche');
const bulkQueriesInput = document.getElementById('bulkQueries');
const dropZone = document.getElementById('dropZone');
const csvFileInput = document.getElementById('csvFileInput');
const bulkPreview = document.getElementById('bulkPreview');
const queryCount = document.getElementById('queryCount');

const speedSelect = document.getElementById('speed');
const exportFormatSelect = document.getElementById('exportFormat');
const searchPrepositionSingle = document.getElementById('searchPrepositionSingle');
const customPrepositionSingle = document.getElementById('customPrepositionSingle');
const searchPrepositionBulk = document.getElementById('searchPrepositionBulk');
const customPrepositionBulk = document.getElementById('customPrepositionBulk');
const extractEmailsCheckbox = document.getElementById('extractEmails');
const extractEmailsBulkCheckbox = document.getElementById('extractEmailsBulk');
const headerStartBtn = document.getElementById('headerStartBtn');
const exportBtn = document.getElementById('exportBtn');
const clearResultsBtn = document.getElementById('clearResultsBtn');

const progressSection = document.getElementById('progressSection');
const bulkProgress = document.getElementById('bulkProgress');
const currentQuery = document.getElementById('currentQuery');
const totalQueries = document.getElementById('totalQueries');
const currentSearchQuery = document.getElementById('currentSearchQuery');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const elapsedTime = document.getElementById('elapsedTime');
const resultsContainer = document.getElementById('resultsContainer');
const resultsActions = document.getElementById('resultsActions');
const resultsCount = document.getElementById('resultsCount');
const historyContainer = document.getElementById('historyContainer');
const bulkSessionContainer = document.getElementById('bulkSessionContainer');

const selectAllLink = document.getElementById('selectAllLink');
const exportSelectedBtn = document.getElementById('exportSelectedBtn');
const bulkExportSelectedBtn = document.getElementById('bulkExportSelectedBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const bulkDeleteSelectedBtn = document.getElementById('bulkDeleteSelectedBtn');
const bulkSelectAllLink = document.getElementById('bulkSelectAllLink');

// Settings Elements
const headlessModeCheckbox = document.getElementById('headlessMode');
const defaultExportFormatSelect = document.getElementById('defaultExportFormat');
const developerModeCheckbox = document.getElementById('developerMode');
const fastModeParallelScrapingInput = document.getElementById('fastModeParallelScraping');
const fastModeParallelWarning = document.getElementById('fastModeParallelWarning');
const fastModeParallelScrapingDefaultBtn = document.getElementById('fastModeParallelScrapingDefault');

// Track which delete operation is being performed
let currentDeleteOperation = 'all'; // 'all' for all selected items, 'bulk' for only bulk sessions

// Track selected history items
let selectedHistoryItems = new Set();

// Initialize with error handling
try {
  loadHistory();
} catch (e) {
  console.error('loadHistory failed:', e);
}

try {
  initializeSettings();
} catch (e) {
  console.error('initializeSettings failed:', e);
}

try {
  updateStats();
} catch (e) {
  console.error('updateStats failed:', e);
}

// Event Listeners
bulkModeToggle.addEventListener('change', toggleBulkMode);
document.getElementById('headerStartBtn').addEventListener('click', () => {
  if (isScrapingActive) {
    stopScraping();
  } else {
    startScraping();
  }
});
exportBtn.addEventListener('click', exportData);
document.getElementById('sendToWebhookBtn').addEventListener('click', sendToWebhook);
document.getElementById('copyBtn').addEventListener('click', copyResults);
document.getElementById('closeCopyOptionsBtn').addEventListener('click', () => {
  document.getElementById('copyOptionsModal').classList.remove('show');
  // Remove all copy notifications when modal is closed
  const notifications = document.querySelectorAll('.copied-notification');
  notifications.forEach(notification => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  });
});

// Close modal when clicking outside (this was duplicated, now cleaned)
document.getElementById('copyOptionsModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('copyOptionsModal')) {
    document.getElementById('copyOptionsModal').classList.remove('show');
    // Remove all copy notifications when modal is closed
    const notifications = document.querySelectorAll('.copied-notification');
    notifications.forEach(notification => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }
});
document.getElementById('copyAsTableBtn').addEventListener('click', () => copyAsTable());
document.getElementById('copyAsJsonBtn').addEventListener('click', () => copyAsJson());
clearResultsBtn.addEventListener('click', clearResults);


// Selection Event Listeners
selectAllLink.addEventListener('click', (e) => {
  e.preventDefault();
  toggleSelectAll();
});

bulkSelectAllLink.addEventListener('click', (e) => {
  e.preventDefault();
  toggleSelectAllBulk();
});
exportSelectedBtn.addEventListener('click', () => {
  document.getElementById('exportOptionsModal').classList.add('show');
});
bulkExportSelectedBtn.addEventListener('click', () => {
  document.getElementById('exportOptionsModal').classList.add('show');
});
deleteSelectedBtn.addEventListener('click', () => {
  const count = selectedHistoryItems.size;
  if (count === 0) {
    showCustomAlert('No Records Selected', 'Please select at least one record to delete.');
    return;
  }

  currentDeleteOperation = 'all'; // Set context to delete all selected items
  document.getElementById('deleteCount').textContent = count;
  document.getElementById('deleteConfirmModal').classList.add('show');
});

// Settings Event Listeners
document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('settingsModal').classList.add('show');
});

// Fast Mode Parallel Scraping setting
fastModeParallelScrapingInput.addEventListener('input', (e) => {
  const value = parseInt(e.target.value);
  if (value > 6) {
    fastModeParallelWarning.style.display = 'block';
  } else {
    fastModeParallelWarning.style.display = 'none';
  }

  // Also validate that value is within range
  if (value < 1) {
    e.target.value = 1;
  } else if (value > 10) {
    // Allow up to 10 but show warning for values above 6
    fastModeParallelWarning.style.display = 'block';
  }

  localStorage.setItem('fastModeParallelScraping', e.target.value);
});

// Initialize the warning display based on saved value
fastModeParallelScrapingInput.addEventListener('change', (e) => {
  const value = parseInt(e.target.value);
  if (value > 6) {
    fastModeParallelWarning.style.display = 'block';
  } else {
    fastModeParallelWarning.style.display = 'none';
  }
});

// Fast Mode Parallel Scraping Default Button
fastModeParallelScrapingDefaultBtn.addEventListener('click', () => {
  fastModeParallelScrapingInput.value = '2'; // Set to default value
  localStorage.setItem('fastModeParallelScraping', '2');

  // Update warning display after setting default
  fastModeParallelWarning.style.display = 'none';
});

document.getElementById('closeSettingsBtn').addEventListener('click', () => {
  document.getElementById('settingsModal').classList.remove('show');
});

// Help Modal Event Listeners
document.getElementById('helpBtn').addEventListener('click', () => {
  document.getElementById('helpModal').classList.add('show');
});

document.getElementById('closeHelpBtn').addEventListener('click', () => {
  document.getElementById('helpModal').classList.remove('show');
});

// Support Modal Event Listeners
document.getElementById('supportBtn').addEventListener('click', () => {
  document.getElementById('supportModal').classList.add('show');
});

document.getElementById('closeSupportBtn').addEventListener('click', () => {
  document.getElementById('supportModal').classList.remove('show');
});

document.getElementById('themeSelect').addEventListener('change', (e) => {
  const theme = e.target.value;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
});

// Webhook URL event listener
const webhookUrlInput = document.getElementById('webhookUrl');
if (webhookUrlInput) {
  webhookUrlInput.addEventListener('input', (e) => {
    localStorage.setItem('webhookUrl', e.target.value);
  });
}


// Copy email functionality
document.getElementById('copyEmailBtn').addEventListener('click', () => {
  const email = 'joserobertodeguia@gmail.com';
  navigator.clipboard.writeText(email).then(() => {
    showCopiedNotification();
  }).catch(err => {
    console.error('Failed to copy email: ', err);
  });
});

// Create a function to show the "Copied" notification
function showCopiedNotification() {
  // Remove any existing notifications
  const existingNotification = document.getElementById('copied-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const copyEmailBtn = document.getElementById('copyEmailBtn');
  if (!copyEmailBtn) return;

  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'copied-notification';
  notification.textContent = 'Copied!';
  notification.style.position = 'absolute';
  notification.style.backgroundColor = 'var(--success, #10b981)';
  notification.style.color = 'white';
  notification.style.padding = '6px 12px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '10000';
  notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(10px)';
  notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  notification.style.fontSize = '12px';
  notification.style.whiteSpace = 'nowrap';

  // Position the notification near the email button
  const rect = copyEmailBtn.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  notification.style.top = (rect.top + scrollTop - 35) + 'px'; // Position above the button
  notification.style.left = (rect.left + scrollLeft + rect.width / 2 - notification.offsetWidth / 2) + 'px';

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Preposition dropdown handlers
searchPrepositionSingle.addEventListener('change', (e) => {
  const value = e.target.value;
  if (value === 'custom') {
    customPrepositionSingle.style.display = 'block';
  } else {
    customPrepositionSingle.style.display = 'none';
  }
  localStorage.setItem('searchPrepositionSingle', value);
});

searchPrepositionBulk.addEventListener('change', (e) => {
  const value = e.target.value;
  if (value === 'custom') {
    customPrepositionBulk.style.display = 'block';
  } else {
    customPrepositionBulk.style.display = 'none';
  }
  localStorage.setItem('searchPrepositionBulk', value);
});

customPrepositionSingle.addEventListener('input', (e) => {
  localStorage.setItem('customPrepositionSingle', e.target.value);
});

customPrepositionBulk.addEventListener('input', (e) => {
  localStorage.setItem('customPrepositionBulk', e.target.value);
});

headlessModeCheckbox.addEventListener('change', (e) => {
  localStorage.setItem('headlessMode', e.target.checked);
});

defaultExportFormatSelect.addEventListener('change', (e) => {
  localStorage.setItem('defaultExportFormat', e.target.value);
});



// Developer Mode Listener
if (developerModeCheckbox) {
  developerModeCheckbox.addEventListener('change', (e) => {
    localStorage.setItem('developerMode', e.target.checked);
  });
}

// F12 Interception
window.addEventListener('keydown', (e) => {
  if (e.key === 'F12') {
    e.preventDefault();
    e.stopPropagation();

    const developerMode = localStorage.getItem('developerMode') === 'true';
    if (developerMode) {
      // Toggle DevTools via Electron API
      window.electronAPI.toggleDevTools();
    }
    return false;
  }
});


// Export Options Modal Event Listeners
document.getElementById('closeExportOptionsBtn').addEventListener('click', () => {
  document.getElementById('exportOptionsModal').classList.remove('show');
});

document.getElementById('exportSingleCsvBtn').addEventListener('click', () => {
  document.getElementById('exportOptionsModal').classList.remove('show');

  // Check if there's a currentExportRecord (individual record export)
  if (window.currentExportRecord) {
    // This is an individual bulk record export - treat as single CSV for that record
    exportSingleBulkRecord(window.currentExportRecord, 'single');
    // Clear the temporary record
    delete window.currentExportRecord;
  } else {
    // This is for selected records via checkboxes - export all selected records
    exportSelectedRecords('single');
  }
});

document.getElementById('exportSeparateCsvBtn').addEventListener('click', () => {
  document.getElementById('exportOptionsModal').classList.remove('show');

  // Check if there's a currentExportRecord (individual record export)
  if (window.currentExportRecord) {
    // This is an individual bulk record export - treat as separate CSVs for that record
    exportSingleBulkRecord(window.currentExportRecord, 'separate');
    // Clear the temporary record
    delete window.currentExportRecord;
  } else {
    // This is for selected records via checkboxes - export all selected records separately
    exportSelectedRecords('separate');
  }
});

// Delete Confirmation Modal Event Listeners
document.getElementById('closeDeleteConfirmBtn').addEventListener('click', () => {
  document.getElementById('deleteConfirmModal').classList.remove('show');
});

document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
  document.getElementById('deleteConfirmModal').classList.remove('show');
});

document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
  document.getElementById('deleteConfirmModal').classList.remove('show');
  if (currentDeleteOperation === 'bulk') {
    deleteSelectedBulkRecords();
  } else {
    deleteSelectedRecords(); // Default behavior for all records
  }
});

// Bulk Delete Selected Records
bulkDeleteSelectedBtn.addEventListener('click', () => {
  const selectedBulkItems = Array.from(selectedHistoryItems).filter(timestamp => {
    const record = history.searches.find(s => s.timestamp === timestamp);
    return record && record.isBulk;
  });

  if (selectedBulkItems.length === 0) {
    showCustomAlert('No Bulk Sessions Selected', 'Please select at least one bulk session record to delete.');
    return;
  }

  currentDeleteOperation = 'bulk'; // Set context to delete only bulk sessions
  document.getElementById('deleteCount').textContent = selectedBulkItems.length;
  document.getElementById('deleteConfirmModal').classList.add('show');
});

// Bulk mode file handling
dropZone.addEventListener('click', () => csvFileInput.click());
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);
csvFileInput.addEventListener('change', handleFileSelect);
bulkQueriesInput.addEventListener('input', handleManualInput);

window.electronAPI.onScrapingProgress((progress) => {
  updateProgress(progress);
});

// Functions

function toggleBulkMode() {
  isBulkMode = bulkModeToggle.checked;

  if (isBulkMode) {
    singleMode.style.display = 'none';
    bulkMode.style.display = 'block';

    // In bulk mode, show all speed options normally
    const speedSelect = document.getElementById('speed');
    const fastOption = speedSelect.querySelector('option[value="fast"]');
    if (fastOption) {
      fastOption.disabled = false;
      fastOption.style.opacity = '1';
    }

    document.getElementById('fastModeSubtext').style.display = 'none';
  } else {
    singleMode.style.display = 'block';
    bulkMode.style.display = 'none';

    // In single mode, grey out fast mode option and show subtext
    const speedSelect = document.getElementById('speed');
    const fastOption = speedSelect.querySelector('option[value="fast"]');
    if (fastOption) {
      fastOption.disabled = false; // Keep enabled but show it's for emails
      fastOption.style.opacity = '0.6'; // Visually indicate it's different
    }

    document.getElementById('fastModeSubtext').style.display = 'block';
  }
}

function handleDragOver(e) {
  e.preventDefault();
  dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  dropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    parseCSVFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    parseCSVFile(files[0]);
  }
}

function parseCSVFile(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split('\n').filter(line => line.trim());

    bulkQueries = [];

    // Check if first line is a header
    const startIndex = lines[0].toLowerCase().includes('zip') ||
      lines[0].toLowerCase().includes('city') ||
      lines[0].toLowerCase().includes('state') ||
      lines[0].toLowerCase().includes('location') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by comma and extract the first column only
      const parts = line.split(',').map(p => p.replace(/^\"|\"$/g, '').trim());

      // Use only the first column (which should be the city or zip)
      if (parts.length > 0 && parts[0]) {
        bulkQueries.push(parts[0]);
      }
    }

    updateBulkPreview();
  };

  reader.readAsText(file);
}

function handleManualInput() {
  const text = bulkQueriesInput.value;
  const lines = text.split('\n').filter(line => line.trim());

  bulkQueries = lines.map(line => line.trim());
  updateBulkPreview();
}

function updateBulkPreview() {
  if (bulkQueries.length > 0) {
    bulkPreview.style.display = 'block';
    queryCount.textContent = bulkQueries.length;
  } else {
    bulkPreview.style.display = 'none';
  }
}

async function loadHistory() {
  history = await window.electronAPI.getHistory();
  renderHistory();
}

function renderHistory() {
  // Clear selected items when refreshing history to prevent stale selections
  selectedHistoryItems.clear();

  if (!history.searches || history.searches.length === 0) {
    historyContainer.innerHTML = '<p class="empty-text">No history yet</p>';
    bulkSessionContainer.innerHTML = '<p class="empty-text">No bulk sessions yet</p>';
    combineAllBtn.style.display = 'none';
    selectAllLink.style.display = 'none';
    exportSelectedBtn.style.display = 'none';
    deleteSelectedBtn.style.display = 'none';
    return;
  }

  // Filter records for regular history and bulk sessions
  const regularHistory = history.searches.filter(item => !item.isBulk);
  const bulkSessions = history.searches.filter(item => item.isBulk);

  // Show regular history
  if (regularHistory.length === 0) {
    historyContainer.innerHTML = '<p class="empty-text">No history yet</p>';
  } else {
    // Show selection controls
    selectAllLink.style.display = 'inline';
    selectAllLink.textContent = 'Select All';
    updateSelectionUI();

    // Update combineAllBtn based on whether any items are selected
    const regularSelectedCount = Array.from(selectedHistoryItems).filter(timestamp => {
      const record = history.searches.find(s => s.timestamp === timestamp);
      return record && !record.isBulk; // Only count regular history items
    }).length;

    // Show combineAllBtn only when regular history items are selected


    historyContainer.innerHTML = regularHistory
      .slice(-10)
      .reverse()
      .map(item => {
        const isChecked = selectedHistoryItems.has(item.timestamp) ? 'checked' : '';

        return `
        <div class="history-item clickable has-checkbox" data-query="${escapeHtml(item.query)}" data-timestamp="${item.timestamp}">
          <input type="checkbox" class="history-checkbox" data-timestamp="${item.timestamp}" ${isChecked}>
          <div class="history-content">
            <div class="history-query">${escapeHtml(item.query)}</div>
            <div class="history-meta">
              ${item.count} results • ${new Date(item.timestamp).toLocaleString()}
            </div>
          </div>
          <div class="history-actions">
            <button class="btn-icon export-history" title="Export this record">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
              </svg>
            </button>
            <button class="btn-icon delete-history" title="Delete this record" data-timestamp="${item.timestamp}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          </div>
        </div>
      `;
      })
      .join('');
  }

  // Show bulk sessions
  if (bulkSessions.length === 0) {
    bulkSessionContainer.innerHTML = '<p class="empty-text">No bulk sessions yet</p>';
    bulkSelectAllLink.style.display = 'none';
  } else {
    bulkSessionContainer.innerHTML = bulkSessions
      .slice(-10)
      .reverse()
      .map(item => {
        const statusLabel = item.status === 'cancelled' ? '<span class="status-badge cancelled">Cancelled</span>' :
          item.status === 'paused' ? '<span class="status-badge paused">Paused</span>' :
            item.status === 'processing' ? '<span class="status-badge processing">Processing</span>' : '';
        const resumeBtn = (item.status === 'cancelled' || item.status === 'paused') && item.isBulk ?
          `<button class="btn-icon resume-bulk" title="Resume bulk scraping" data-query="${escapeHtml(item.query)}" data-timestamp="${item.timestamp}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>` : '';

        const isChecked = selectedHistoryItems.has(item.timestamp) ? 'checked' : '';
        const eyeIcon = item.isBulk ?
          `<button class="btn-icon view-queries" title="View queries" data-timestamp="${item.timestamp}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
          </button>` : '';
        return `
        <div class="history-item has-checkbox" data-query="${escapeHtml(item.query)}" data-timestamp="${item.timestamp}">
          <input type="checkbox" class="history-checkbox" data-timestamp="${item.timestamp}" ${isChecked}>
          <div class="history-content">
            <div class="history-query">${item.isBulk ? escapeHtml(item.query.replace(/^Bulk: /, '')) : escapeHtml(item.query)} ${statusLabel}</div>
            <div class="history-meta">
              ${item.count} results • ${new Date(item.timestamp).toLocaleString()}
            </div>
          </div>
          <div class="history-actions">
            ${eyeIcon}
            ${resumeBtn}
            <button class="btn-icon export-history" title="Export this record">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
              </svg>
            </button>
            <button class="btn-icon delete-history" title="Delete this record" data-timestamp="${item.timestamp}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    // Show bulk selection controls
    bulkSelectAllLink.style.display = 'inline';
    bulkSelectAllLink.textContent = 'Select All'; // Default to 'Select All'
  }

  // Add checkbox change handlers for all history items (regular and bulk sessions)
  document.querySelectorAll('.history-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.stopPropagation();
      const timestamp = cb.dataset.timestamp;
      if (cb.checked) {
        selectedHistoryItems.add(timestamp);
      } else {
        selectedHistoryItems.delete(timestamp);
      }
      updateSelectionUI();

      // Update regular history select all link text based only on regular history items
      const allCheckboxes = document.querySelectorAll('.history-checkbox');
      const regularCheckboxes = Array.from(allCheckboxes).filter(cb => {
        const record = history.searches.find(s => s.timestamp === cb.dataset.timestamp);
        return record && !record.isBulk; // Only regular history items, not bulk
      });
      const regularAllChecked = regularCheckboxes.length > 0 && regularCheckboxes.every(cb => cb.checked);
      selectAllLink.textContent = regularAllChecked ? 'Deselect All' : 'Select All';

      // Update bulk sessions select all link text based only on bulk session items
      const bulkCheckboxes = Array.from(allCheckboxes).filter(cb => {
        const record = history.searches.find(s => s.timestamp === cb.dataset.timestamp);
        return record && record.isBulk; // Only bulk session items
      });
      const bulkAllChecked = bulkCheckboxes.length > 0 && bulkCheckboxes.every(cb => cb.checked);
      bulkSelectAllLink.textContent = bulkAllChecked ? 'Deselect All' : 'Select All';
    });
  });

  // Add click handlers for export history buttons (distinguishing bulk session vs regular history exports)
  document.querySelectorAll('.export-history').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent the click from bubbling to the item click handler
      const historyItem = e.target.closest('.history-item');
      const query = historyItem.dataset.query;
      const timestamp = historyItem.dataset.timestamp;

      // Find the matching history record
      const record = history.searches.find(s => s.query === query && s.timestamp === timestamp);
      if (!record || !record.data) return;

      // Check the number of selected items to determine export behavior
      const selectedCount = selectedHistoryItems.size;

      // If this is a bulk session record, always show the export options modal
      if (record.isBulk) {
        // Store the record for export when user chooses an option
        window.currentExportRecord = record;
        // Show export options modal for bulk records
        document.getElementById('exportOptionsModal').classList.add('show');
      } else {
        // For regular history records:
        // - Show options modal if 2 or more records are selected
        // - Export directly if only this one is selected (or none)
        if (selectedCount >= 2) {
          // Multiple records selected, show options modal
          document.getElementById('exportOptionsModal').classList.add('show');
        } else {
          // Only one record (or none) selected, export directly
          exportSingleRecord(record);
        }
      }
    });
  });

  // Add click handlers for all history items (regular and bulk sessions) to display results
  document.querySelectorAll('.history-item.clickable, .history-item.has-checkbox').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't trigger if clicking on checkbox or action buttons
      if (e.target.classList.contains('history-checkbox') || e.target.closest('.history-actions')) return;

      const query = item.dataset.query;
      const timestamp = item.dataset.timestamp;

      // Find the matching history record
      const record = history.searches.find(s => s.query === query && s.timestamp === timestamp);
      if (!record || !record.data) return;

      // Display the results
      scrapedData = record.data;
      renderResults(record.data);

      // Update stats to show data from the selected record
      updateStats(record.data);

      // Scroll to results section
      document.querySelector('.results-section').scrollIntoView({ behavior: 'smooth' });

      // Highlight the selected history item
      document.querySelectorAll('.history-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
    });
  });

  // Add click handlers for resume buttons (for bulk sessions)
  document.querySelectorAll('.resume-bulk').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const query = btn.dataset.query;
      const timestamp = btn.dataset.timestamp;

      // Find the matching history record
      const record = history.searches.find(s => s.query === query && s.timestamp === timestamp);
      if (!record || !record.bulkData) return;

      const statusMessage = record.status === 'paused' ? 'paused' : 'cancelled';
      const confirmed = await showConfirmationModal('Resume Bulk Scraping', `Resume scraping for "${record.bulkData.niche}"?\n\nThis will continue from where it was ${statusMessage}.`);

      if (confirmed) {
        // Find the record to resume
        const recordIndex = history.searches.findIndex(s => s.query === query && s.timestamp === timestamp);
        if (recordIndex !== -1) {
          const originalRecord = history.searches[recordIndex];

          // Update the record status to processing
          originalRecord.status = 'processing';

          // Identify which queries need to be processed (the remaining ones)
          // Set their status to 'pending' so they get processed
          if (originalRecord.bulkData && originalRecord.bulkData.queryStatus) {
            // Find the original full query list and mark only remaining queries as pending
            const queryStatus = originalRecord.bulkData.queryStatus;

            // Reset all queries in remainingQueries to 'pending' and others to 'completed'
            for (let i = 0; i < Object.keys(queryStatus).length; i++) {
              if (queryStatus[i]) {
                const queryLocation = queryStatus[i].location;
                // Mark as pending if it's in remaining queries, completed otherwise
                queryStatus[i].status = record.bulkData.remainingQueries.includes(queryLocation) ? 'pending' : 'completed';
              }
            }
          }
        }

        // Save the updated history
        await window.electronAPI.saveHistory(history);

        // Refresh the UI to show the updated status
        renderHistory();

        // Restore bulk mode state
        bulkModeToggle.checked = true;
        toggleBulkMode();
        bulkNicheInput.value = record.bulkData.niche;
        bulkQueries = record.bulkData.remainingQueries;
        bulkQueriesInput.value = bulkQueries.join('\n');
        updateBulkPreview();

        // No need to set currentBulkOperation here - it's handled in startBulkScraping

        // Start scraping with resume info to avoid creating a new record
        await startBulkScraping(timestamp); // Pass the timestamp of the resumed record
      }
    });
  });

  // Add click handlers for view queries buttons
  document.querySelectorAll('.view-queries').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const timestamp = btn.dataset.timestamp;

      // Find the matching history record
      const record = history.searches.find(s => s.timestamp === timestamp);
      if (!record || !record.isBulk) return;

      // Create query status list
      let queryList = '<div style="max-height: 400px; overflow-y: auto; margin-top: 10px;">';

      if (record.bulkData && record.bulkData.queryStatus) {
        // Use the detailed query status information
        const queryStatus = record.bulkData.queryStatus;

        // Display queries in order with their status and checkboxes
        for (let i = 0; i < Object.keys(queryStatus).length; i++) {
          if (queryStatus[i]) {
            const location = queryStatus[i].location;
            const status = queryStatus[i].status === 'completed' ? 'Scraped' : 'No';
            const statusClass = queryStatus[i].status === 'completed' ? 'status-scraped' : 'status-continue';
            const checkboxId = `query-checkbox-${i}-${timestamp}`;
            queryList += `<div class="query-item">
                            <input type="checkbox" id="${checkboxId}" class="query-checkbox" data-location="${escapeHtml(location)}">
                            <label for="${checkboxId}" class="query-checkbox-label">
                              <span class="query-location">${escapeHtml(location)}</span> - <span class="query-status ${statusClass}">${status}</span>
                            </label>
                          </div>`;
          }
        }
      } else if (record.bulkData && record.bulkData.queries) {
        // Fallback to original method if queryStatus is not available
        const allQueries = record.bulkData.queries;
        const completedCount = record.bulkData.completedCount || 0;

        allQueries.forEach((query, index) => {
          const status = index < completedCount ? 'Scraped' : 'No';
          const statusClass = index < completedCount ? 'status-scraped' : 'status-continue';
          const checkboxId = `query-checkbox-${index}-${timestamp}`;
          queryList += `<div class="query-item">
                          <input type="checkbox" id="${checkboxId}" class="query-checkbox" data-location="${escapeHtml(query)}">
                          <label for="${checkboxId}" class="query-checkbox-label">
                            <span class="query-location">${escapeHtml(query)}</span> - <span class="query-status ${statusClass}">${status}</span>
                          </label>
                        </div>`;
        });
      } else if (record.bulkData && record.bulkData.remainingQueries) {
        // If we only have remaining queries
        const totalQueries = record.query.match(/\((\d+) locations\)/);
        const total = totalQueries ? parseInt(totalQueries[1]) : 0;
        const completed = total - record.bulkData.remainingQueries.length;

        // Generate list of all queries and mark each
        for (let i = 0; i < total; i++) {
          const status = i < completed ? 'Scraped' : 'No';
          const statusClass = i < completed ? 'status-scraped' : 'status-continue';
          const checkboxId = `query-checkbox-${i}-${timestamp}`;
          queryList += `<div class="query-item">
                          <input type="checkbox" id="${checkboxId}" class="query-checkbox" data-location="Query ${i + 1}">
                          <label for="${checkboxId}" class="query-checkbox-label">
                            <span class="query-location">Query ${i + 1}</span> - <span class="query-status ${statusClass}">${status}</span>
                          </label>
                        </div>`;
        }
      } else {
        queryList += '<div class="query-item">No query info available</div>';
      }

      queryList += '</div>';

      showQueryStatusModal(record.query, queryList, timestamp);
    });
  });

  // Add click handlers for delete buttons in both regular and bulk history items
  document.querySelectorAll('.delete-history').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const timestamp = btn.dataset.timestamp;

      // Find the matching history record
      const record = history.searches.find(s => s.timestamp === timestamp);
      if (!record) return;

      // Confirm deletion
      if (confirm(`Are you sure you want to delete this record?\n\nQuery: ${record.query}`)) {
        // Remove from history
        history.searches = history.searches.filter(s => s.timestamp !== timestamp);

        // Save and refresh UI
        window.electronAPI.saveHistory(history)
          .then(() => {
            renderHistory();
            updateStats();
          })
          .catch(err => console.error('Error saving history after deletion:', err));
      }
    });
  });
}

// Show query status modal
function showQueryStatusModal(title, content, timestamp) {
  // Remove existing modal if any
  const existingModal = document.getElementById('queryStatusModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'queryStatusModal';
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Query Status</h2>
        <button class="btn-icon" onclick="this.closest('#queryStatusModal').remove()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <p style="text-align: center; margin-bottom: 20px; color: var(--text-secondary);">
          ${escapeHtml(title)}
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 14px; color: var(--text-secondary);">Select queries to export:</span>
          <button id="selectAllQueriesBtn" style="padding: 4px 8px; border: none; background: transparent; color: rgba(255, 255, 255, 0.5); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; text-decoration: none;">Select All</button>
        </div>
        <div class="queries-list" style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
          ${content}
        </div>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button id="exportSelectedQueriesBtn" class="btn-primary">Export Selected</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners for the new buttons
  const selectAllBtn = modal.querySelector('#selectAllQueriesBtn');
  const exportBtn = modal.querySelector('#exportSelectedQueriesBtn');
  const checkboxes = modal.querySelectorAll('.query-checkbox');

  selectAllBtn.addEventListener('click', () => {
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(checkbox => {
      checkbox.checked = !allChecked;
    });

    // Update button text and styling
    if (allChecked) {
      selectAllBtn.textContent = 'Select All';
      selectAllBtn.style.textDecoration = 'none';
    } else {
      selectAllBtn.textContent = 'Deselect All';
      selectAllBtn.style.textDecoration = 'underline';
    }
  });

  // Add hover effect
  selectAllBtn.addEventListener('mouseenter', () => {
    selectAllBtn.style.color = 'rgba(255, 255, 255, 0.9)';
    selectAllBtn.style.textDecoration = 'underline';
  });

  selectAllBtn.addEventListener('mouseleave', () => {
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    selectAllBtn.style.color = 'rgba(255, 255, 255, 0.5)';
    selectAllBtn.style.textDecoration = allChecked ? 'underline' : 'none';
  });

  exportBtn.addEventListener('click', () => {
    const selectedCheckboxes = modal.querySelectorAll('.query-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
      alert('Please select at least one query to export.');
      return;
    }

    // Get the original bulk record to access the full data
    // Get the original bulk record to access the full data
    const bulkRecord = history.searches.find(s => s.timestamp === timestamp);
    if (!bulkRecord || !bulkRecord.data || !Array.isArray(bulkRecord.data)) {
      alert('No data available for export.');
      return;
    }

    // Filter the bulk data based on selected queries
    const selectedLocations = Array.from(selectedCheckboxes).map(cb => cb.dataset.location);

    // Debug logging
    console.log('Selected locations:', selectedLocations);
    console.log('Total items in bulk record:', bulkRecord.data.length);

    const filteredData = bulkRecord.data.filter(item => {
      const itemSearchQuery = item.search_query || '';

      // Check if this item matches any of the selected locations
      const matches = selectedLocations.some(selectedLoc => {
        // Try multiple matching strategies
        const lowerQuery = itemSearchQuery.toLowerCase();
        const lowerLoc = selectedLoc.toLowerCase();

        // Check if the query ends with this location (most reliable)
        if (lowerQuery.endsWith(lowerLoc)) return true;

        // Check if the location appears as a complete word
        const words = lowerQuery.split(/\s+/);
        if (words.includes(lowerLoc)) return true;

        // For multi-word locations, check if they appear together
        if (lowerLoc.includes(' ') && lowerQuery.includes(lowerLoc)) return true;

        return false;
      });

      if (matches) {
        console.log('Matched item:', itemSearchQuery);
      }

      return matches;
    });

    if (filteredData.length === 0) {
      alert('No matching data found for selected queries.');
      return;
    }

    // Export the data from the bulk record based on selected locations
    exportFilteredData(bulkRecord, selectedLocations);
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Function to export filtered data from selected queries in bulk session
async function exportFilteredData(bulkRecord, selectedLocations) {
  if (!bulkRecord || !bulkRecord.data || !Array.isArray(bulkRecord.data) || !selectedLocations || selectedLocations.length === 0) {
    alert('No data to export');
    return;
  }

  // Filter the bulk data based on selected queries
  console.log('Filtering data for locations:', selectedLocations);
  console.log('Total data items:', bulkRecord.data.length);

  const filteredData = bulkRecord.data.filter(item => {
    const itemSearchQuery = item.search_query || '';

    const matches = selectedLocations.some(selectedLoc => {
      const lowerQuery = itemSearchQuery.toLowerCase();
      const lowerLoc = selectedLoc.toLowerCase();

      // Check if the query ends with this location
      if (lowerQuery.endsWith(lowerLoc)) return true;

      // Check if the location appears as a complete word
      const words = lowerQuery.split(/\s+/);
      if (words.includes(lowerLoc)) return true;

      // For multi-word locations, check if they appear together
      if (lowerLoc.includes(' ') && lowerQuery.includes(lowerLoc)) return true;

      return false;
    });

    return matches;
  });

  console.log('Filtered data count:', filteredData.length);

  if (filteredData.length === 0) {
    alert('No matching data found for selected queries.');
    return;
  }

  // Create a meaningful filename using the bulk title and selected count
  const bulkTitleClean = bulkRecord.query.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 30);
  const locationCount = selectedLocations.length;
  const filename = `${bulkTitleClean}_selected_${locationCount}_queries.csv`;

  const result = await window.electronAPI.exportData({
    data: filteredData,
    format: 'csv',
    filename
  });

  // Silently handle success/failure - no popup
  if (!result.success && !result.cancelled) {
    console.error('Export failed:', result.error);
  }
}

// Show confirmation modal that returns a promise
function showConfirmationModal(title, message) {
  return new Promise((resolve) => {
    // Remove existing modal if any
    const existingModal = document.getElementById('confirmationModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'confirmationModal';
    modal.className = 'modal show';
    modal.innerHTML = `
      <div class="modal-content" style="width: 500px; max-width: 90vw;">
        <div class="modal-header">
          <h2>${escapeHtml(title)}</h2>
          <button class="btn-icon" id="closeConfirmationModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="text-align: center; color: var(--text-secondary); white-space: pre-line;">${escapeHtml(message)}</p>
          <div style="display: flex; justify-content: center; gap: 12px; margin-top: 20px;">
            <button class="btn-secondary" id="cancelResumeBtn">Cancel</button>
            <button class="btn-primary" id="confirmResumeBtn">Resume</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('closeConfirmationModal').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });

    document.getElementById('cancelResumeBtn').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });

    document.getElementById('confirmResumeBtn').addEventListener('click', () => {
      modal.remove();
      resolve(true);
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    });
  });
}

// Timer Functions
function startTimer() {
  startTime = Date.now();
  elapsedTime.textContent = '00:00';

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    elapsedTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

async function startScraping() {
  // Auto-clear previous results
  scrapedData = [];
  resultsContainer.innerHTML = '<div class="empty-state"><p>Scraping in progress...</p></div>';
  resultsActions.style.display = 'none';
  resultsCount.textContent = '0';

  if (isBulkMode) {
    await startBulkScraping();
  } else {
    await startSingleScraping();
  }
}

async function startSingleScraping() {
  const niche = nicheInput.value.trim();
  const location = locationInput.value.trim();

  if (!niche || !location) {
    showCustomAlert('Missing Fields', 'Please fill in both Niche and Location fields');
    return;
  }

  // Get preposition from dropdown
  let preposition = searchPrepositionSingle.value;
  if (preposition === 'custom') {
    preposition = customPrepositionSingle.value.trim() || 'in';
  }
  const query = `${niche} ${preposition} ${location}`;

  // Update header button to Stop
  isScrapingActive = true;
  headerStartBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
    Stop
  `;
  headerStartBtn.classList.remove('btn-primary');
  headerStartBtn.classList.add('btn-danger');

  // Show progress section
  progressSection.style.display = 'block';
  progressSection.classList.add('active');
  bulkProgress.style.display = 'none';


  // Clear previous results
  scrapedData = [];
  resultsContainer.innerHTML = '<div class="empty-state"><p>Scraping in progress...</p></div>';
  updateStats();

  const options = {
    niche,
    location,
    speed: speedSelect.value,
    extractEmails: extractEmailsCheckbox.checked,
    headless: headlessModeCheckbox.checked
  };

  // Start timer
  startTimer();

  const result = await window.electronAPI.startScraping(options);

  // Stop timer
  stopTimer();

  // Reset header button to Start
  isScrapingActive = false;
  headerStartBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5v14l11-7z" />
    </svg>
    Start Scraping
  `;
  headerStartBtn.classList.remove('btn-danger');
  headerStartBtn.classList.add('btn-primary');
  headerStartBtn.disabled = false;
  headerStartBtn.style.opacity = '1';

  if (result.stopped) {
    if (result.data && result.data.length > 0) {
      scrapedData = result.data;
      renderResults(result.data);

      // Save cancelled scrape to history with status
      history.searches.push({
        query,
        count: result.data.length,
        timestamp: new Date().toISOString(),
        data: result.data,
        status: 'cancelled',
        isBulk: false
      });
      await window.electronAPI.saveHistory(history);
      renderHistory();
      updateStats();

      progressText.textContent = `⏸ Stopped. Extracted ${result.data.length} businesses so far.`;
      progressText.style.color = 'var(--warning)';
    } else {
      progressText.textContent = '⏸ Scraping stopped by user.';
      progressText.style.color = 'var(--text-secondary)';
    }
  } else if (result.success) {
    scrapedData = result.data;
    renderResults(result.data);

    history.searches.push({
      query,
      count: result.data.length,
      timestamp: new Date().toISOString(),
      data: result.data // Save the actual data in history
    });
    await window.electronAPI.saveHistory(history);
    renderHistory();
    updateStats();

    progressText.textContent = `✓ Successfully scraped ${result.data.length} businesses!`;
    progressText.style.color = 'var(--success)';


    // Ensure UI remains responsive after scraping
    setTimeout(() => {
      // Ensure all inputs are selectable
      const allInputs = document.querySelectorAll('input, select, textarea, button');
      allInputs.forEach(input => {
        if (input) {
          input.style.pointerEvents = 'auto';
          input.style.userSelect = 'auto';
        }
      });
    }, 100);
  } else {
    progressText.textContent = `✗ Error: ${result.error}`;
    progressText.style.color = 'var(--error)';
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <p style="color: var(--error)">Scraping failed. Please try again.</p>
      </div>
    `;

    // Ensure UI remains responsive after error
    setTimeout(() => {
      // Ensure all inputs are selectable
      const allInputs = document.querySelectorAll('input, select, textarea, button');
      allInputs.forEach(input => {
        if (input) {
          input.style.pointerEvents = 'auto';
          input.style.userSelect = 'auto';
        }
      });
    }, 100);
  }
}

async function startBulkScraping(resumedTimestamp = null) {
  const niche = bulkNicheInput.value.trim();
  const selectedSpeed = speedSelect.value;

  if (!niche) {
    showCustomAlert('Missing Niche', 'Please enter a business niche');
    return;
  }

  if (bulkQueries.length === 0) {
    showCustomAlert('Missing Queries', 'Please upload a CSV file or enter queries manually');
    return;
  }

  let timestamp;
  if (resumedTimestamp) {
    // This is a resumed operation, use the existing timestamp
    timestamp = resumedTimestamp;
  } else {
    // This is a new operation, create a new timestamp
    timestamp = new Date().toISOString();
  }

  const bulkQueryLabel = `Bulk: ${niche} (${bulkQueries.length} locations)`;

  // Only create a new processing record if this is not a resumed operation
  if (!resumedTimestamp) {
    // Create initial query status map
    const initialQueryStatus = {};
    bulkQueries.forEach((location, index) => {
      initialQueryStatus[index] = { location, status: 'pending' };
    });

    // Add processing record to history immediately
    const processingRecord = {
      query: bulkQueryLabel,
      count: 0,
      timestamp: timestamp,
      data: [],
      status: 'processing',
      isBulk: true,
      bulkData: {
        niche: niche,
        totalQueries: bulkQueries.length,
        completedQueries: 0,
        queries: [...bulkQueries], // Store the original queries
        queryStatus: initialQueryStatus, // Track status of each query
        speed: selectedSpeed
      }
    };

    history.searches.push(processingRecord);
  } else {
    // For resumed operations, the record already exists, we just need to ensure it has the right status
    const existingRecordIndex = history.searches.findIndex(s => s.timestamp === resumedTimestamp);
    if (existingRecordIndex !== -1) {
      // Ensure the status is processing
      history.searches[existingRecordIndex].status = 'processing';
    }
  }

  await window.electronAPI.saveHistory(history);
  renderHistory();

  // Track current bulk operation - if resuming, preserve resume info
  if (resumedTimestamp && currentBulkOperation && currentBulkOperation.resumedFromRecord) {
    // This is a resumed operation, update the existing tracking info
    currentBulkOperation.timestamp = timestamp;
    currentBulkOperation.niche = niche;
    currentBulkOperation.queries = [...bulkQueries];
    currentBulkOperation.completedQueries = 0;
    currentBulkOperation.results = [];
  } else {
    // This is a new operation, create fresh tracking info
    currentBulkOperation = {
      timestamp: timestamp,
      niche: niche,
      queries: [...bulkQueries],
      completedQueries: 0,
      results: []
    };
  }

  // Update header button to Stop
  isScrapingActive = true;
  headerStartBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
    Stop
  `;
  headerStartBtn.classList.remove('btn-primary');
  headerStartBtn.classList.add('btn-danger');

  progressSection.style.display = 'block';
  progressSection.classList.add('visible');
  bulkProgress.style.display = 'block';
  totalQueries.textContent = bulkQueries.length;

  // Initialize or keep existing scraped data
  if (!scrapedData) scrapedData = [];
  let totalResults = 0;

  // Get last processed index from localStorage for resume functionality
  const resumeKey = `bulk_resume_${niche}_${bulkQueries.join('_').substring(0, 50)}`;
  const lastProcessedIndex = parseInt(localStorage.getItem(resumeKey) || '0');

  if (lastProcessedIndex > 0) {
    const resume = confirm(`Found previous session. Resume from query ${lastProcessedIndex + 1}?`);
    if (!resume) {
      localStorage.removeItem(resumeKey);
    }
  }

  const startIndex = lastProcessedIndex > 0 ? lastProcessedIndex : 0;

  // Start timer
  startTimer();
  const queryStartTimes = [];

  // Check if running in fast mode for parallel processing
  if (selectedSpeed === 'fast' || selectedSpeed === 'ultra-fast') {
    // Show fast mode content in the existing progress section
    document.getElementById('bulkProgress').style.display = 'none';
    document.getElementById('fastBulkProgress').style.display = 'block';

    // Set up fast mode progress
    document.getElementById('fastTotalQueries').textContent = bulkQueries.length;
    document.getElementById('fastCompletedQueries').textContent = startIndex;
    document.getElementById('progressText').textContent = 'Starting fast bulk scraping...';
    document.getElementById('progressPercent').textContent = '0%';
    document.getElementById('progressFill').style.width = '0%';

    // Parallel processing for fast mode: use user-defined number of queries at a time
    const defaultParallelLimit = 2;
    const savedParallelLimit = parseInt(localStorage.getItem('fastModeParallelScraping')) || defaultParallelLimit;
    const parallelLimit = savedParallelLimit > 0 ? savedParallelLimit : defaultParallelLimit;
    let completedQueries = startIndex; // Track completed queries for progress

    // Process queries in batches of user-defined size
    for (let i = startIndex; i < bulkQueries.length; i += parallelLimit) {
      if (!isScrapingActive) {
        // Save current index for resume
        localStorage.setItem(resumeKey, i.toString());
        break;
      }

      // Calculate the actual batch size (might be less for the last batch)
      const batchSize = Math.min(parallelLimit, bulkQueries.length - i);

      // Create promises for up to 2 queries in parallel
      const batchPromises = [];
      for (let j = 0; j < batchSize; j++) {
        const queryIndex = i + j;
        if (!isScrapingActive) break;

        const location = bulkQueries[queryIndex];
        // Get preposition from dropdown
        let preposition = searchPrepositionBulk.value;
        if (preposition === 'custom') {
          preposition = customPrepositionBulk.value.trim() || 'in';
        }
        const query = `${niche} ${preposition} ${location}`;

        // Update progress to show current batch processing
        const currentBatch = Math.floor(i / parallelLimit) + 1;
        const totalBatches = Math.ceil(bulkQueries.length / parallelLimit);
        progressText.textContent = `Processing batch: ${currentBatch}/${totalBatches} (${batchSize} parallel queries)`;
        progressText.style.color = 'var(--text-primary)';

        const queryPromise = window.electronAPI.startScraping({
          niche,
          location,
          speed: selectedSpeed,
          extractEmails: extractEmailsBulkCheckbox.checked,
          headless: headlessModeCheckbox.checked
        }).then(result => ({
          queryIndex,
          location,
          query,
          result
        }));

        batchPromises.push(queryPromise);
      }

      // Wait for the current batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Process results and update UI for each completed query
      for (const batchResult of batchResults) {
        const { queryIndex, location, query, result } = batchResult;

        if (!isScrapingActive) {
          // Save current index for resume
          localStorage.setItem(resumeKey, queryIndex.toString());
          break;
        }

        currentQuery.textContent = queryIndex + 1;
        currentSearchQuery.textContent = query;

        if (result.stopped) {
          localStorage.setItem(resumeKey, queryIndex.toString());
          break;
        }

        if (result.success && result.data.length > 0) {
          const dataWithQuery = result.data.map(item => ({
            ...item,
            search_query: query,
            search_location: location
          }));

          scrapedData.push(...dataWithQuery);
          totalResults += result.data.length;

          // Find the processing bulk record and update its query status
          const processingRecordIndex = history.searches.findIndex(item =>
            item.timestamp === timestamp && item.status === 'processing' && item.isBulk
          );

          if (processingRecordIndex !== -1) {
            // Update the specific query status - need to find original index for resumed operations
            const processingRecord = history.searches[processingRecordIndex];

            if (processingRecord.bulkData && processingRecord.bulkData.queryStatus) {
              // Find the correct index by matching the location
              let originalIndex = -1;
              const queryStatus = processingRecord.bulkData.queryStatus;

              for (let i = 0; i < Object.keys(queryStatus).length; i++) {
                if (queryStatus[i] && queryStatus[i].location === location) {
                  originalIndex = i;
                  break;
                }
              }

              if (originalIndex !== -1 && queryStatus[originalIndex]) {
                // Update the status for the specific location
                queryStatus[originalIndex].status = 'completed';
                processingRecord.bulkData.completedQueries += 1;
              }
            }

            // Update total count
            history.searches[processingRecordIndex].count += result.data.length;

            // Update the main bulk record's data with the current accumulated data
            history.searches[processingRecordIndex].data = [...scrapedData];
          }

          // Save history after each query since we're updating the main bulk record
          await window.electronAPI.saveHistory(history);

          // Update UI immediately - note: for bulk operations, results are already in the main bulk record
          renderResults(scrapedData);
          updateStats();

          progressText.textContent = `✓ ${query}: Found ${result.data.length} businesses (Total: ${scrapedData.length})`;
          progressText.style.color = 'var(--success)';
        } else {
          // Mark as completed even if no results
          const processingRecordIndex = history.searches.findIndex(item =>
            item.timestamp === timestamp && item.status === 'processing' && item.isBulk
          );

          if (processingRecordIndex !== -1) {
            // Update the specific query status - need to find original index for resumed operations
            const processingRecord = history.searches[processingRecordIndex];

            if (processingRecord.bulkData && processingRecord.bulkData.queryStatus) {
              // Find the correct index by matching the location
              let originalIndex = -1;
              const queryStatus = processingRecord.bulkData.queryStatus;

              for (let i = 0; i < Object.keys(queryStatus).length; i++) {
                if (queryStatus[i] && queryStatus[i].location === location) {
                  originalIndex = i;
                  break;
                }
              }

              if (originalIndex !== -1 && queryStatus[originalIndex]) {
                // Update the status for the specific location
                queryStatus[originalIndex].status = 'completed';
                processingRecord.bulkData.completedQueries += 1;
              }
            }
          }

          progressText.textContent = `⚠ ${query}: No results found`;
          progressText.style.color = 'var(--warning)';
        }

        // Update fast mode progress counter and bar - calculate based on actual completed queries
        let actualCompletedCount = 0;
        const processingRecordIndex = history.searches.findIndex(item =>
          item.timestamp === timestamp && item.status === 'processing' && item.isBulk
        );

        if (processingRecordIndex !== -1 && history.searches[processingRecordIndex].bulkData) {
          actualCompletedCount = history.searches[processingRecordIndex].bulkData.completedQueries;
        }

        // Calculate progress percentage using the new logic: floor((completed/total) * 100)
        const progressPercent = Math.floor((actualCompletedCount / bulkQueries.length) * 100);

        // Update fast mode progress elements using the shared progress section
        document.getElementById('fastCompletedQueries').textContent = actualCompletedCount;
        document.getElementById('progressFill').style.width = `${progressPercent}%`;
        document.getElementById('progressPercent').textContent = `${progressPercent}%`;

        // Update the text to show current status
        document.getElementById('progressText').textContent = `Query completed - ${actualCompletedCount}/${bulkQueries.length} done (${progressPercent}%)`;
        document.getElementById('progressText').style.color = 'var(--success)';

        if (progressPercent === 100 && progressPercent !== 0) {
          document.getElementById('progressText').textContent = `✓ Completed! Scraped ${scrapedData.length} businesses in total`;
          document.getElementById('progressText').style.color = 'var(--success)';
        }

        // Save progress
        localStorage.setItem(resumeKey, (queryIndex + 1).toString());
      }

      // Small delay between batches to avoid overwhelming
      if (isScrapingActive) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } else {
    // For normal mode, show regular progress and hide fast mode progress
    document.getElementById('bulkProgress').style.display = 'block';
    document.getElementById('fastBulkProgress').style.display = 'none';

    // Original sequential processing for normal mode
    for (let i = startIndex; i < bulkQueries.length; i++) {
      const queryStartTime = Date.now();

      if (!isScrapingActive) {
        // Save current index for resume
        localStorage.setItem(resumeKey, i.toString());
        break;
      }

      const location = bulkQueries[i];
      // Get preposition from dropdown
      let preposition = searchPrepositionBulk.value;
      if (preposition === 'custom') {
        preposition = customPrepositionBulk.value.trim() || 'in';
      }
      const query = `${niche} ${preposition} ${location}`;

      currentQuery.textContent = i + 1;
      currentSearchQuery.textContent = query;

      progressText.textContent = `Processing: ${query}`;
      progressFill.style.width = `${((i / bulkQueries.length) * 100)}%`;

      const options = {
        niche,
        location,
        speed: selectedSpeed,
        extractEmails: extractEmailsBulkCheckbox.checked,
        headless: headlessModeCheckbox.checked
      };

      try {
        const result = await window.electronAPI.startScraping(options);

        if (result.stopped) {
          localStorage.setItem(resumeKey, i.toString());
          break;
        }

        if (result.success && result.data.length > 0) {
          const dataWithQuery = result.data.map(item => ({
            ...item,
            search_query: query,
            search_location: location
          }));

          scrapedData.push(...dataWithQuery);
          totalResults += result.data.length;

          // Find the processing bulk record and update its query status
          const processingRecordIndex = history.searches.findIndex(item =>
            item.timestamp === timestamp && item.status === 'processing' && item.isBulk
          );

          if (processingRecordIndex !== -1) {
            // Update the specific query status - need to find original index for resumed operations
            const processingRecord = history.searches[processingRecordIndex];

            if (processingRecord.bulkData && processingRecord.bulkData.queryStatus) {
              // Find the correct index by matching the location
              let originalIndex = -1;
              const queryStatus = processingRecord.bulkData.queryStatus;

              for (let i = 0; i < Object.keys(queryStatus).length; i++) {
                if (queryStatus[i] && queryStatus[i].location === location) {
                  originalIndex = i;
                  break;
                }
              }

              if (originalIndex !== -1 && queryStatus[originalIndex]) {
                // Update the status for the specific location
                queryStatus[originalIndex].status = 'completed';
                processingRecord.bulkData.completedQueries += 1;
              }
            }

            // Update total count
            history.searches[processingRecordIndex].count += result.data.length;

            // Update the main bulk record's data with the current accumulated data
            history.searches[processingRecordIndex].data = [...scrapedData];
          }

          // Save history after each query since we're updating the main bulk record
          await window.electronAPI.saveHistory(history);

          // Update UI immediately - note: for bulk operations, results are already in the main bulk record
          renderResults(scrapedData);
          updateStats();

          progressText.textContent = `✓ ${query}: Found ${result.data.length} businesses (Total: ${scrapedData.length})`;
          progressText.style.color = 'var(--success)';
        } else {
          // Mark as completed even if no results
          const processingRecordIndex = history.searches.findIndex(item =>
            item.timestamp === timestamp && item.status === 'processing' && item.isBulk
          );

          if (processingRecordIndex !== -1) {
            // Update the specific query status - need to find original index for resumed operations
            const processingRecord = history.searches[processingRecordIndex];

            if (processingRecord.bulkData && processingRecord.bulkData.queryStatus) {
              // Find the correct index by matching the location
              let originalIndex = -1;
              const queryStatus = processingRecord.bulkData.queryStatus;

              for (let i = 0; i < Object.keys(queryStatus).length; i++) {
                if (queryStatus[i] && queryStatus[i].location === location) {
                  originalIndex = i;
                  break;
                }
              }

              if (originalIndex !== -1 && queryStatus[originalIndex]) {
                // Update the status for the specific location
                queryStatus[originalIndex].status = 'completed';
                processingRecord.bulkData.completedQueries += 1;
              }
            }
          }

          progressText.textContent = `⚠ ${query}: No results found`;
          progressText.style.color = 'var(--warning)';
        }
      } catch (error) {
        console.error(`Error scraping ${query}:`, error);
        progressText.textContent = `✗ ${query}: Error occurred`;
        progressText.style.color = 'var(--error)';
      }


      // Save progress
      localStorage.setItem(resumeKey, (i + 1).toString());

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Stop timer
  stopTimer();

  // Reset header button to Start
  isScrapingActive = false;
  headerStartBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5v14l11-7z" />
    </svg>
    Start Scraping
  `;
  headerStartBtn.classList.remove('btn-danger');
  headerStartBtn.classList.add('btn-primary');
  headerStartBtn.disabled = false;
  headerStartBtn.style.opacity = '1';

  const wasCancelled = !isScrapingActive;
  const currentIndex = parseInt(localStorage.getItem(resumeKey) || '0');

  // Clear resume data on completion
  if (isScrapingActive) {
    localStorage.removeItem(resumeKey);
  }

  progressFill.style.width = '100%';

  if (scrapedData.length > 0) {
    if (wasCancelled && currentIndex < bulkQueries.length) {
      // Find and update the existing processing record to paused
      const processingRecordIndex = history.searches.findIndex(item =>
        item.timestamp === timestamp && item.status === 'processing' && item.isBulk
      );

      if (processingRecordIndex !== -1) {
        // Update the existing processing record to paused, preserving all data
        // Calculate the actual number of completed queries based on queryStatus
        let actualCompletedCount = 0;
        if (history.searches[processingRecordIndex].bulkData && history.searches[processingRecordIndex].bulkData.queryStatus) {
          const queryStatus = history.searches[processingRecordIndex].bulkData.queryStatus;
          for (let i = 0; i < Object.keys(queryStatus).length; i++) {
            if (queryStatus[i] && queryStatus[i].status === 'completed') {
              actualCompletedCount++;
            }
          }
        }

        // Update the record in place rather than replacing completely
        history.searches[processingRecordIndex].query = `Bulk: ${niche} (${actualCompletedCount}/${history.searches[processingRecordIndex].bulkData.totalQueries} completed)`;
        history.searches[processingRecordIndex].count = scrapedData.length;
        history.searches[processingRecordIndex].data = scrapedData;
        history.searches[processingRecordIndex].status = 'paused';

        // Update bulkData - determine remaining queries from queryStatus
        const remainingQueries = [];
        if (history.searches[processingRecordIndex].bulkData && history.searches[processingRecordIndex].bulkData.queryStatus) {
          const queryStatus = history.searches[processingRecordIndex].bulkData.queryStatus;
          for (let i = 0; i < Object.keys(queryStatus).length; i++) {
            if (queryStatus[i] && queryStatus[i].status !== 'completed') {
              remainingQueries.push(queryStatus[i].location);
            }
          }
        }

        history.searches[processingRecordIndex].bulkData.niche = niche;
        history.searches[processingRecordIndex].bulkData.remainingQueries = remainingQueries;
        history.searches[processingRecordIndex].bulkData.completedCount = actualCompletedCount;
      } else {
        // Fallback: add new record if processing record not found
        const remainingQueries = bulkQueries.slice(currentIndex);
        history.searches.push({
          query: `Bulk: ${niche} (${currentIndex}/${bulkQueries.length} completed)`,
          count: scrapedData.length,
          timestamp: new Date().toISOString(),
          data: scrapedData,
          status: 'paused',
          isBulk: true,
          bulkData: {
            niche,
            remainingQueries,
            completedCount: currentIndex
          }
        });
      }

      await window.electronAPI.saveHistory(history);
      renderHistory();
      updateStats();

      progressText.textContent = `⏸ Paused. Scraped ${scrapedData.length} businesses (${currentIndex}/${bulkQueries.length} queries completed)`;
      progressText.style.color = 'var(--warning)';
    } else {
      // Update the existing processing record to completed
      const processingRecordIndex = history.searches.findIndex(item =>
        item.timestamp === timestamp && item.status === 'processing' && item.isBulk
      );

      if (processingRecordIndex !== -1) {
        history.searches[processingRecordIndex].count = scrapedData.length;
        history.searches[processingRecordIndex].data = scrapedData;
        history.searches[processingRecordIndex].status = 'completed';

        // Update the query to show completed status
        const totalQueries = history.searches[processingRecordIndex].bulkData.totalQueries;
        history.searches[processingRecordIndex].query = `Bulk: ${niche} (${totalQueries}/${totalQueries} completed)`;
      }

      await window.electronAPI.saveHistory(history);
      renderHistory();
      updateStats();

      progressText.textContent = `✓ Completed! Scraped ${scrapedData.length} businesses in total`;
      progressText.style.color = 'var(--success)';
    }
  } else {
    // For the case when no data exists but operation was cancelled
    if (wasCancelled) {
      const processingRecordIndex = history.searches.findIndex(item =>
        item.timestamp === timestamp && item.status === 'processing' && item.isBulk
      );

      if (processingRecordIndex !== -1) {
        // Calculate completed count based on queryStatus
        let actualCompletedCount = 0;
        if (history.searches[processingRecordIndex].bulkData && history.searches[processingRecordIndex].bulkData.queryStatus) {
          const queryStatus = history.searches[processingRecordIndex].bulkData.queryStatus;
          for (let i = 0; i < Object.keys(queryStatus).length; i++) {
            if (queryStatus[i] && queryStatus[i].status === 'completed') {
              actualCompletedCount++;
            }
          }
        }

        // Update the record in place rather than replacing
        history.searches[processingRecordIndex].status = 'paused';
        history.searches[processingRecordIndex].query = `Bulk: ${niche} (${actualCompletedCount}/${history.searches[processingRecordIndex].bulkData.totalQueries} completed)`;

        // Update remaining queries based on queryStatus
        const remainingQueries = [];
        if (history.searches[processingRecordIndex].bulkData && history.searches[processingRecordIndex].bulkData.queryStatus) {
          const queryStatus = history.searches[processingRecordIndex].bulkData.queryStatus;
          for (let i = 0; i < Object.keys(queryStatus).length; i++) {
            if (queryStatus[i] && queryStatus[i].status !== 'completed') {
              remainingQueries.push(queryStatus[i].location);
            }
          }
        }

        history.searches[processingRecordIndex].bulkData.remainingQueries = remainingQueries;
        history.searches[processingRecordIndex].bulkData.completedCount = actualCompletedCount;
      }

      await window.electronAPI.saveHistory(history);
      renderHistory();
      updateStats();
    }

    progressText.textContent = '⏸ Scraping stopped.';
    progressText.style.color = 'var(--text-secondary)';
  }

  // Final save
  await window.electronAPI.saveHistory(history);
  renderHistory();
  updateStats();

  // Show regular bulk progress (instead of fast mode) and reset to default view
  document.getElementById('bulkProgress').style.display = 'block';
  document.getElementById('fastBulkProgress').style.display = 'none';
}

async function stopScraping() {
  if (!isScrapingActive) return;

  // Show custom confirmation modal instead of native confirm
  const confirmed = await showStopConfirmationModal();

  if (confirmed) {
    isScrapingActive = false;

    // Update header button to show stopping state
    headerStartBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
      </svg>
      Stopping scraper...
    `;
    headerStartBtn.disabled = true;
    headerStartBtn.style.opacity = '0.6';

    await window.electronAPI.stopScraping();

    // Update the progress text (same element is used for both fast and regular modes)
    document.getElementById('progressText').textContent = '⏸ Stopping scraper...';
    document.getElementById('progressText').style.color = 'var(--warning)';
  }
}

// Show stop confirmation modal
function showStopConfirmationModal() {
  return new Promise((resolve) => {
    // Remove existing modal if any
    const existingModal = document.getElementById('stopConfirmationModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'stopConfirmationModal';
    modal.className = 'modal show';
    modal.innerHTML = `
      <div class="modal-content" style="width: 450px; max-width: 90vw;">
        <div class="modal-header">
          <h2>⚠️ Stop Scraping</h2>
          <button class="btn-icon" id="closeStopModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="text-align: center; color: var(--text-secondary); margin-bottom: 20px;">
            Are you sure you want to stop scraping?
          </p>
          <p style="text-align: center; color: var(--text-secondary); margin-bottom: 25px; font-style: italic;">
            You will keep the data scraped so far.
          </p>
          <div style="display: flex; justify-content: center; gap: 12px;">
            <button class="btn-secondary" id="cancelStopBtn">Cancel</button>
            <button class="btn-danger" id="confirmStopBtn">Stop Scraping</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('closeStopModal').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });

    document.getElementById('cancelStopBtn').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });

    document.getElementById('confirmStopBtn').addEventListener('click', () => {
      modal.remove();
      resolve(true);
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    });
  });
}


function updateProgress(progress) {
  const { status, message, current, total, data } = progress;
  const progressSection = document.getElementById('progressSection');

  // Ensure progress section is visible
  progressSection.style.display = 'block';
  progressSection.classList.add('active');

  // Update progress text
  progressText.textContent = message;

  // Update live results if data is provided
  if (data && data.length > 0) {
    scrapedData = data;
    renderResults(data);
    updateStats(data);  // Show stats for live results
  }

  // Update progress bar
  if (current && total) {
    const percentage = (current / total) * 100;
    progressFill.style.width = `${percentage}%`;
    if (progressPercent) progressPercent.textContent = `${Math.round(percentage)}%`;
  } else {
    switch (status) {
      case 'starting':
        progressFill.style.width = '10%';
        if (progressPercent) progressPercent.textContent = '10%';
        break;
      case 'navigating':
        progressFill.style.width = '20%';
        if (progressPercent) progressPercent.textContent = '20%';
        break;
      case 'scrolling':
        progressFill.style.width = '40%';
        if (progressPercent) progressPercent.textContent = '40%';
        break;
      case 'extracting':
        progressFill.style.width = '60%';
        if (progressPercent) progressPercent.textContent = '60%';
        break;
      case 'processing':
        progressFill.style.width = '80%';
        if (progressPercent) progressPercent.textContent = '80%';
        break;
      case 'complete':
        progressFill.style.width = '100%';
        if (progressPercent) progressPercent.textContent = '100%';
        progressSection.classList.remove('active');
        break;
      case 'error':
        progressFill.style.width = '100%';
        progressFill.style.backgroundColor = 'var(--error)';
        if (progressPercent) progressPercent.textContent = '100%';
        progressSection.classList.remove('active');
        break;
    }
  }
}

function clearResults() {
  if (isScrapingActive) {
    alert('Cannot clear results while scraping is active.');
    return;
  }

  scrapedData = [];
  resultsContainer.innerHTML = '<div class="empty-state"><p>No results yet</p></div>';
  resultsActions.style.display = 'none';

  // Reset stats to show overall totals
  updateStats();

  // Reset progress
  progressText.textContent = 'Ready to scrape';
  progressFill.style.width = '0%';
  if (progressPercent) progressPercent.textContent = '0%';
}
function renderResults(data) {
  if (!data || data.length === 0) {
    resultsContainer.innerHTML = '<div class="empty-state"><p>No results found</p></div>';
    resultsActions.style.display = 'none';
    return;
  }

  resultsActions.style.display = 'flex';
  resultsCount.textContent = `${data.length} results`;

  resultsContainer.innerHTML = data
    .map(item => `
      <div class="result-item">
        <div class="result-header">
          <div>
            <div class="result-name">${escapeHtml(item.name)}</div>
            ${item.category ? `<div class="result-category">${escapeHtml(item.category)}</div>` : ''}
            ${item.search_query ? `<div class="result-category" style="color: var(--accent-primary); margin-top: 4px;">Query: ${escapeHtml(item.search_query)}</div>` : ''}
          </div>
          ${item.rating ? `
            <div class="result-rating">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
              ${item.rating} ${item.reviews ? `(${item.reviews})` : ''}
            </div>
          ` : ''}
        </div>
        <div class="result-details">
          ${item.address ? `
            <div class="detail-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>${escapeHtml(item.address)}</span>
            </div>
          ` : ''}
          ${item.phone ? `
            <div class="detail-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              <span>${escapeHtml(item.phone)}</span>
            </div>
          ` : ''}
          ${item.website ? `
            <div class="detail-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
              </svg>
              <a href="${item.website}" target="_blank" style="color: #06b6d4;">${truncate(item.website, 50)}</a>
            </div>
          ` : ''}
          ${item.email ? `
            <div class="detail-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              <a href="mailto:${item.email}" style="color: #06b6d4;">${item.email}</a>
            </div>
          ` : ''}
          ${item.owner ? `
            <div class="detail-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <a href="${item.owner}" target="_blank">Owner Profile</a>
            </div>
          ` : ''}
        </div>
      </div>
    `)
    .join('');
}

async function exportData() {
  if (!scrapedData || scrapedData.length === 0) {
    alert('No data to export');
    return;
  }

  const format = exportFormatSelect.value;

  // Use query name for filename instead of timestamp
  let queryName = 'export';
  if (nicheInput.value && locationInput.value) {
    queryName = `${nicheInput.value.trim()}-${locationInput.value.trim()}`;
  } else if (bulkNicheInput.value) {
    queryName = bulkNicheInput.value.trim();
  }
  // Clean filename
  queryName = queryName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = `${queryName}.${format}`;

  const result = await window.electronAPI.exportData({
    data: scrapedData,
    format,
    filename
  });

  if (result.success && !result.cancelled) {
    alert(`Data exported successfully to:\n${result.filePath}`);
  } else if (!result.cancelled) {
    alert(`Export failed: ${result.error}`);
  }
}

async function sendToWebhook() {
  if (!scrapedData || scrapedData.length === 0) {
    showCustomAlert('No Data', 'No data to send to webhook');
    return;
  }

  // Get webhook URL from settings
  const webhookUrl = localStorage.getItem('webhookUrl');
  if (!webhookUrl || webhookUrl.trim() === '') {
    showCustomAlert('Webhook Not Configured', 'Please configure a Webhook URL in Settings first.');
    return;
  }

  // Basic URL validation
  try {
    new URL(webhookUrl);
  } catch (e) {
    showCustomAlert('Invalid URL', 'Invalid Webhook URL configured in Settings. Please check and update it.');
    return;
  }

  // Disable the Send POST button and show loading state
  const sendBtn = document.getElementById('sendToWebhookBtn');
  const originalText = sendBtn.textContent;
  sendBtn.disabled = true;
  sendBtn.style.opacity = '0.5';
  sendBtn.style.cursor = 'not-allowed';
  sendBtn.textContent = 'Sending...';

  try {
    // Send the data to the webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: scrapedData,
        timestamp: new Date().toISOString(),
        count: scrapedData.length
      })
    });

    if (response.ok) {
      showCustomAlert('Success', `Successfully sent ${scrapedData.length} records to webhook!`);
    } else {
      showCustomAlert('Request Failed', `Webhook request failed with status: ${response.status}`);
    }
  } catch (error) {
    showCustomAlert('Network Error', `Failed to send data to webhook:\n${error.message}`);
  } finally {
    // Re-enable the button
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
    sendBtn.style.cursor = 'pointer';
    sendBtn.textContent = originalText;
  }
}

async function copyResults() {
  if (!scrapedData || scrapedData.length === 0) {
    alert('No data to copy');
    return;
  }

  // Show the copy options modal
  document.getElementById('copyOptionsModal').classList.add('show');
}

// Function to copy data as a table (TSV format for Excel compatibility)
async function copyAsTable() {
  if (!scrapedData || scrapedData.length === 0) {
    alert('No data to copy');
    return;
  }

  try {
    // Convert to TSV (Tab-Separated Values) format for better Excel compatibility
    let tsvContent = '';

    if (scrapedData.length > 0) {
      // Get headers from the first object
      const headers = Object.keys(scrapedData[0]);
      tsvContent = headers.join('\t') + '\n';  // Use tab instead of comma

      // Add each row of data
      scrapedData.forEach(row => {
        const values = headers.map(header => {
          let value = row[header] || '';
          // Replace tabs and newlines to avoid breaking the TSV format
          value = String(value).replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
          return value;
        });
        tsvContent += values.join('\t') + '\n';  // Use tab instead of comma
      });
    }

    // Copy to clipboard
    await navigator.clipboard.writeText(tsvContent);

    // Show copied notification next to the Copy as Table button
    showCopiedNotification('copyTableOption', 'Copied!');

  } catch (error) {
    alert(`Error copying data to clipboard: ${error.message}`);
  }
}

// Function to copy data as JSON
async function copyAsJson() {
  if (!scrapedData || scrapedData.length === 0) {
    alert('No data to copy');
    return;
  }

  try {
    // Convert data to JSON string
    const jsonString = JSON.stringify(scrapedData, null, 2);

    // Copy to clipboard
    await navigator.clipboard.writeText(jsonString);

    // Show copied notification next to the Copy as JSON button
    showCopiedNotification('copyJsonOption', 'Copied!');

  } catch (error) {
    alert(`Error copying data to clipboard: ${error.message}`);
  }
}

// Function to show copied notification similar to the email copy notification
function showCopiedNotification(parentId, message) {
  // Remove any existing notifications for this specific parent
  const existingNotification = document.querySelector(`.copied-notification[data-parent="${parentId}"]`);
  if (existingNotification) {
    existingNotification.remove();
  }

  const parentElement = document.getElementById(parentId);
  if (!parentElement) return;

  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'copied-notification';
  notification.setAttribute('data-parent', parentId);
  notification.textContent = message;
  notification.style.position = 'absolute';
  notification.style.backgroundColor = 'var(--success, #10b981)';
  notification.style.color = 'white';
  notification.style.padding = '6px 12px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '10000';
  notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(10px)';
  notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  notification.style.fontSize = '12px';
  notification.style.whiteSpace = 'nowrap';
  notification.style.cursor = 'pointer';

  // Add a small close button (X) to the notification
  const closeIcon = document.createElement('span');
  closeIcon.innerHTML = ' ×';
  closeIcon.style.marginLeft = '5px';
  closeIcon.style.fontWeight = 'bold';
  closeIcon.onclick = function (event) {
    event.stopPropagation();
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  };
  notification.appendChild(closeIcon);

  // Position the notification next to the parent element
  const rect = parentElement.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  notification.style.top = (rect.top + scrollTop + rect.height / 2 - 12) + 'px'; // Center vertically
  notification.style.left = (rect.right + scrollLeft + 10) + 'px'; // Position to the right of the element

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
}



async function clearHistory() {
  try {
    const result = await window.electronAPI.clearHistory();
    if (result.success) {
      history = { searches: [] };
      scrapedData = [];
      renderHistory();
      renderResults([]);
      updateStats();

      // Clear any resume keys from localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('bulk_resume_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Force a complete refresh of the UI state
      setTimeout(() => {
        // Remove focus from any element first
        if (document.activeElement) {
          document.activeElement.blur();
        }

        // Force a complete reflow and repaint
        const body = document.body;
        const originalTransform = body.style.transform;
        body.style.transform = 'translateZ(0)';

        // Give a moment for the reflow to process
        setTimeout(() => {
          body.style.transform = originalTransform || '';

          // Focus on the niche input field
          const nicheInput = document.getElementById('niche');
          if (nicheInput) {
            nicheInput.focus();
            setTimeout(() => {
              // Ensure the field is properly focused and editable
              nicheInput.select();
            }, 50);
          }

          // Ensure all inputs are selectable
          const allInputs = document.querySelectorAll('input, select, textarea, button');
          allInputs.forEach(input => {
            if (input) {
              input.style.pointerEvents = 'auto';
              input.style.userSelect = 'auto';
            }
          });
        }, 50);
      }, 100);
    } else {
      alert('Failed to clear history');
    }
  } catch (error) {
    console.error('Error clearing history:', error);
    alert('An error occurred while clearing history');
  }
}

async function initializeSettings() {
  // Load history
  await loadHistory();

  // Initialize theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.getElementById('themeSelect').value = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);



  // Initialize preposition dropdowns
  const savedPrepositionSingle = localStorage.getItem('searchPrepositionSingle') || 'in';
  searchPrepositionSingle.value = savedPrepositionSingle;
  if (savedPrepositionSingle === 'custom') {
    customPrepositionSingle.style.display = 'block';
    customPrepositionSingle.value = localStorage.getItem('customPrepositionSingle') || '';
  }

  const savedPrepositionBulk = localStorage.getItem('searchPrepositionBulk') || 'in';
  searchPrepositionBulk.value = savedPrepositionBulk;
  if (savedPrepositionBulk === 'custom') {
    customPrepositionBulk.style.display = 'block';
    customPrepositionBulk.value = localStorage.getItem('customPrepositionBulk') || '';
  }

  // Initialize headless mode
  const headlessMode = localStorage.getItem('headlessMode') !== 'false';
  headlessModeCheckbox.checked = headlessMode;

  // Initialize export format
  const exportFormat = localStorage.getItem('defaultExportFormat') || 'csv';
  defaultExportFormatSelect.value = exportFormat;
  exportFormatSelect.value = exportFormat;




  // Initialize Developer Mode
  const developerMode = localStorage.getItem('developerMode') === 'true';
  if (developerModeCheckbox) {
    developerModeCheckbox.checked = developerMode;
  }

  // Initialize Fast Mode Parallel Scraping
  const fastModeParallelValue = localStorage.getItem('fastModeParallelScraping') || '2';
  fastModeParallelScrapingInput.value = fastModeParallelValue;

  // Show warning if the saved value is above 6
  const numericValue = parseInt(fastModeParallelValue);
  if (numericValue > 6) {
    fastModeParallelWarning.style.display = 'block';
  } else {
    fastModeParallelWarning.style.display = 'none';
  }

  // Initialize Webhook URL
  const webhookUrl = localStorage.getItem('webhookUrl') || '';
  const webhookUrlInput = document.getElementById('webhookUrl');
  if (webhookUrlInput) {
    webhookUrlInput.value = webhookUrl;
  }
}

function updateStats(dataToShow = null) {
  const statsSection = document.querySelector('.stats-section');
  if (!statsSection) return;

  let totalCompanies = 0;
  let totalWebsites = 0;
  let totalPhones = 0;
  let totalEmails = 0;
  let lastUpdate = '-';

  // If specific data is provided (e.g. from selected history record), use that
  if (dataToShow && Array.isArray(dataToShow)) {
    totalCompanies = dataToShow.length;
    totalWebsites = dataToShow.filter(item => item.website).length;
    totalPhones = dataToShow.filter(item => item.phone).length;
    totalEmails = dataToShow.filter(item => item.email).length;
  } else {
    // Otherwise, calculate totals from all history for general stats
    if (history.searches && history.searches.length > 0) {
      history.searches.forEach(search => {
        if (search.data) {
          totalCompanies += search.data.length;
          totalWebsites += search.data.filter(item => item.website).length;
          totalPhones += search.data.filter(item => item.phone).length;
          totalEmails += search.data.filter(item => item.email).length;
        }
      });

      // Get the most recent timestamp
      const lastTimestamp = Math.max(...history.searches.map(s => new Date(s.timestamp)));
      lastUpdate = new Date(lastTimestamp).toLocaleDateString();
    }
  }

  document.getElementById('totalCompanies').textContent = totalCompanies.toLocaleString();
  document.getElementById('totalWebsites').textContent = totalWebsites.toLocaleString();
  document.getElementById('totalPhones').textContent = totalPhones.toLocaleString();
  document.getElementById('totalEmails').textContent = totalEmails.toLocaleString();
  const lastUpdateEl = document.getElementById('lastUpdate');
  if (lastUpdateEl) {
    lastUpdateEl.textContent = lastUpdate;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

// Map Initialization and Functions
function initializeMap() {
  // Initialize the map centered on a default location (New York)
  const map = L.map('map-container').setView([40.7128, -74.0060], 13);

  // Add OpenStreetMap tiles (free and no authentication required)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  let marker; // Local marker variable

  // Add click event to set location
  map.on('click', function (e) {
    const { lat, lng } = e.latlng;

    // Update the location input field with coordinates or reverse geocode
    reverseGeocode(lat, lng).then(address => {
      document.getElementById('location').value = address;

      // If we already have a marker, remove it
      if (marker) {
        map.removeLayer(marker);
      }

      // Add new marker with cleaner, more professional styling
      marker = L.marker([lat, lng], {
        title: 'Selected Location'
      }).addTo(map);

      // Create a more professional, styled popup
      const popupContent = `
        <div style="padding: 8px; font-family: 'Inter', sans-serif; color: var(--text-primary); font-size: 13px; line-height: 1.4;">
          <div style="font-weight: 500; margin-bottom: 4px; color: var(--accent-primary);">${address}</div>
          <div style="font-size: 11px; color: var(--text-tertiary);">Selected location</div>
        </div>
      `;
      marker.bindPopup(popupContent, {
        closeBtn: false,
        autoClose: false,
        autoPan: false,
        className: 'custom-popup'
      }).openPopup();
    }).catch(() => {
      // If reverse geocoding fails, use coordinates
      const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      document.getElementById('location').value = coords;

      // If we already have a marker, remove it
      if (marker) {
        map.removeLayer(marker);
      }

      // Add new marker at the clicked location
      marker = L.marker([lat, lng], {
        title: 'Selected Location'
      }).addTo(map);

      const popupContent = `
        <div style="padding: 8px; font-family: 'Inter', sans-serif; color: var(--text-primary); font-size: 13px; line-height: 1.4;">
          <div style="font-weight: 500; margin-bottom: 4px; color: var(--accent-primary);">${coords}</div>
          <div style="font-size: 11px; color: var(--text-tertiary);">Coordinates</div>
        </div>
      `;
      marker.bindPopup(popupContent, {
        closeBtn: false,
        autoClose: false,
        autoPan: false,
        className: 'custom-popup'
      }).openPopup();
    });
  });

  // Add geocoding for the location input
  document.getElementById('location').addEventListener('change', function () {
    const locationQuery = this.value.trim();
    if (locationQuery) {
      geocodeLocation(locationQuery).then(([lat, lng]) => {
        map.setView([lat, lng], 15);

        // If we already have a marker, remove it
        if (marker) {
          map.removeLayer(marker);
        }

        // Add new marker at the geocoded location
        marker = L.marker([lat, lng], {
          title: 'Selected Location'
        }).addTo(map);

        const popupContent = `
          <div style="padding: 8px; font-family: 'Inter', sans-serif; color: var(--text-primary); font-size: 13px; line-height: 1.4;">
            <div style="font-weight: 500; margin-bottom: 4px; color: var(--accent-primary);">${locationQuery}</div>
            <div style="font-size: 11px; color: var(--text-tertiary);">Selected location</div>
          </div>
        `;
        marker.bindPopup(popupContent, {
          closeBtn: false,
          autoClose: false,
          autoPan: false,
          className: 'custom-popup'
        }).openPopup();
      }).catch(err => {
        console.error('Geocoding failed:', err);
      });
    }
  });
}

// Function to reverse geocode coordinates to address
async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    throw error;
  }
}

// Function to geocode address to coordinates
async function geocodeLocation(address) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await response.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } else {
      throw new Error('Location not found');
    }
  } catch (error) {
    console.error('Geocoding failed:', error);
    throw error;
  }
}

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  // Only initialize map if we're on the single mode and map container exists
  if (document.getElementById('map-container')) {
    // Wait a bit for the DOM to be ready
    setTimeout(initializeMap, 100);
  }
});
// Selection Functions
function toggleSelectAll() {
  const allCheckboxes = document.querySelectorAll('.history-checkbox');
  const regularCheckboxes = Array.from(allCheckboxes).filter(cb => {
    const timestamp = cb.dataset.timestamp;
    const record = history.searches.find(s => s.timestamp === timestamp);
    return record && !record.isBulk; // Only regular history items, not bulk sessions
  });

  // Determine if all regular items are currently selected
  const allRegularSelected = regularCheckboxes.length > 0 && regularCheckboxes.every(cb => cb.checked);

  if (allRegularSelected) {
    // Deselect all regular items
    regularCheckboxes.forEach(cb => {
      cb.checked = false;
      selectedHistoryItems.delete(cb.dataset.timestamp);
    });
    selectAllLink.textContent = 'Select All';
  } else {
    // Select all regular items
    regularCheckboxes.forEach(cb => {
      cb.checked = true;
      selectedHistoryItems.add(cb.dataset.timestamp);
    });
    selectAllLink.textContent = 'Deselect All';
  }
  updateSelectionUI();
}

// Toggle select all for bulk sessions only
function toggleSelectAllBulk() {
  const allCheckboxes = document.querySelectorAll('.history-checkbox');
  const bulkCheckboxes = Array.from(allCheckboxes).filter(cb => {
    const timestamp = cb.dataset.timestamp;
    const record = history.searches.find(s => s.timestamp === timestamp);
    return record && record.isBulk;
  });

  // Determine if all visible bulk items are currently selected
  const allBulkSelected = bulkCheckboxes.length > 0 && bulkCheckboxes.every(cb => cb.checked);

  if (allBulkSelected) {
    // Deselect all bulk items
    bulkCheckboxes.forEach(cb => {
      cb.checked = false;
      selectedHistoryItems.delete(cb.dataset.timestamp);
    });
    bulkSelectAllLink.textContent = 'Select All';
  } else {
    // Select all bulk items
    bulkCheckboxes.forEach(cb => {
      cb.checked = true;
      selectedHistoryItems.add(cb.dataset.timestamp);
    });
    bulkSelectAllLink.textContent = 'Deselect All';
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  const allSelectedCount = selectedHistoryItems.size;
  const bulkSelectedCount = Array.from(selectedHistoryItems).filter(timestamp => {
    const record = history.searches.find(s => s.timestamp === timestamp);
    return record && record.isBulk;
  }).length;
  const regularSelectedCount = allSelectedCount - bulkSelectedCount;

  if (allSelectedCount > 0) {
    // Show export/delete buttons when there are selections
    exportSelectedBtn.style.display = regularSelectedCount > 0 ? 'flex' : 'none';
    deleteSelectedBtn.style.display = regularSelectedCount > 0 ? 'flex' : 'none';
    bulkExportSelectedBtn.style.display = bulkSelectedCount > 0 ? 'flex' : 'none';
    bulkDeleteSelectedBtn.style.display = bulkSelectedCount > 0 ? 'flex' : 'none';
    // Show combineAllBtn only when regular history items are selected

  } else {
    // Hide all selected buttons when nothing is selected
    exportSelectedBtn.style.display = 'none';
    deleteSelectedBtn.style.display = 'none';
    bulkExportSelectedBtn.style.display = 'none';
    bulkDeleteSelectedBtn.style.display = 'none';

  }
}

// Export function for a single bulk record
async function exportSingleBulkRecord(record, mode) {
  if (!record || !record.data || record.data.length === 0) {
    showCustomAlert('No Data', 'No data available to export for this record.');
    return;
  }

  if (mode === 'single') {
    // Export all data from the bulk record as a single file
    const format = exportFormatSelect.value; // Get selected format from settings
    const cleanQuery = record.query.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${cleanQuery}.${format}`;

    const result = await window.electronAPI.exportData({
      data: record.data,
      format,
      filename
    });

    if (result.success && !result.cancelled) {
      showCustomAlert('Export Successful', `Data exported to:\n${result.filePath}`);
    } else if (!result.cancelled) {
      showCustomAlert('Export Failed', result.error);
    }
  } else if (mode === 'separate') {
    // Export bulk data as separate files (this would typically be per-query in the bulk session)
    const folderResult = await window.electronAPI.selectFolder();

    if (folderResult.cancelled) return;

    let successCount = 0;
    // If bulkData exists with query-specific data, export each query separately
    if (record.bulkData && record.bulkData.queryStatus) {
      // Export based on query status
      for (let i = 0; i < Object.keys(record.bulkData.queryStatus).length; i++) {
        if (record.bulkData.queryStatus[i] && record.bulkData.queryStatus[i].status === 'completed') {
          const queryData = record.data.filter(item => item.search_location === record.bulkData.queryStatus[i].location);
          if (queryData.length > 0) {
            const cleanLocation = record.bulkData.queryStatus[i].location.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const filename = `${record.bulkData.niche}-${cleanLocation}.csv`;

            const result = await window.electronAPI.exportDataToFolder({
              data: queryData,
              format: 'csv',
              filename,
              folderPath: folderResult.filePath
            });

            if (result.success) successCount++;
          }
        }
      }
    } else if (record.bulkData && record.bulkData.niche) {
      // If we have bulk data but not by query, just export all as one file with different naming
      const cleanNiche = record.bulkData.niche.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const filename = `${cleanNiche}-all-queries.csv`;

      const result = await window.electronAPI.exportDataToFolder({
        data: record.data,
        format: 'csv',
        filename,
        folderPath: folderResult.filePath
      });

      if (result.success) successCount = 1;
    }

    showCustomAlert('Export Complete', `Successfully exported ${successCount} file(s) to:\n${folderResult.filePath}`);
  }
}

// Export function for a single record
async function exportSingleRecord(record) {
  if (!record || !record.data || record.data.length === 0) {
    showCustomAlert('No Data', 'No data available to export for this record.');
    return;
  }

  const format = exportFormatSelect.value; // Get selected format from settings
  const cleanQuery = record.query.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = `${cleanQuery}.${format}`;

  const result = await window.electronAPI.exportData({
    data: record.data,
    format,
    filename
  });

  if (result.success && !result.cancelled) {
    showCustomAlert('Export Successful', `Data exported to:\n${result.filePath}`);
  } else if (!result.cancelled) {
    showCustomAlert('Export Failed', result.error);
  }
}

async function exportSelectedRecords(mode) {
  const selectedRecords = history.searches.filter(s => selectedHistoryItems.has(s.timestamp));

  if (selectedRecords.length === 0) {
    showCustomAlert('No Records Selected', 'Please select at least one record to export.');
    return;
  }

  if (mode === 'single') {
    // Combine all data into single CSV
    const allData = [];
    selectedRecords.forEach(record => {
      if (record.data && record.data.length > 0) {
        allData.push(...record.data);
      }
    });

    const filename = `gscraped-combined.csv`;
    const result = await window.electronAPI.exportData({
      data: allData,
      format: 'csv',
      filename
    });

    if (result.success && !result.cancelled) {
      showCustomAlert('Export Successful', `Combined data exported to:\n${result.filePath}`);
    }
  } else if (mode === 'separate') {
    // Export separate CSV files
    const folderResult = await window.electronAPI.selectFolder();

    if (folderResult.cancelled) return;

    let successCount = 0;
    for (const record of selectedRecords) {
      if (record.data && record.data.length > 0) {
        // Clean query name for filename
        const cleanQuery = record.query.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const filename = `${cleanQuery}.csv`;

        const result = await window.electronAPI.exportDataToFolder({
          data: record.data,
          format: 'csv',
          filename,
          folderPath: folderResult.filePath
        });

        if (result.success) successCount++;
      }
    }

    showCustomAlert('Export Complete', `Successfully exported ${successCount} file(s) to:\n${folderResult.filePath}`);
  }

  // Clear selection
  selectedHistoryItems.clear();
  renderHistory();
}

async function deleteSelectedRecords() {
  const timestamps = Array.from(selectedHistoryItems);

  // Find the records that will be deleted before filtering
  const recordsToBeDeleted = [];
  for (const timestamp of timestamps) {
    const record = history.searches.find(s => s.timestamp === timestamp);
    if (record) {
      recordsToBeDeleted.push(record);
    }
  }

  // Remove selected records from history
  history.searches = history.searches.filter(s => !selectedHistoryItems.has(s.timestamp));

  // Also remove associated bulk resume keys from localStorage for deleted bulk records
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('bulk_resume_')) {
      // Check if this key is related to any of the records being deleted
      for (const record of recordsToBeDeleted) {
        if (record.isBulk && record.bulkData && record.bulkData.niche && Array.isArray(record.bulkData.queries)) {
          // Reconstruct the expected resume key based on the record's niche and queries
          const expectedResumeKey = `bulk_resume_${record.bulkData.niche}_${record.bulkData.queries.join('_').substring(0, 50)}`;

          // Since the queries part might be truncated, match by the beginning
          if (key.startsWith(expectedResumeKey) ||
            (key.startsWith(`bulk_resume_${record.bulkData.niche}_`) &&
              record.bulkData.queries.some(query => key.includes(query.substring(0, 10))))) {
            keysToRemove.push(key);
            break; // Found a match, no need to check other records for this key
          }
        }
      }
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Save updated history
  await window.electronAPI.saveHistory(history);

  // Clear selection
  selectedHistoryItems.clear();

  // Update UI
  renderHistory();
  updateStats();

  showCustomAlert('Records Deleted', `Successfully deleted ${timestamps.length} record(s).`);
}

// Delete only selected bulk session records
async function deleteSelectedBulkRecords() {
  // Get only the selected bulk session records
  const selectedBulkItems = Array.from(selectedHistoryItems).filter(timestamp => {
    const record = history.searches.find(s => s.timestamp === timestamp);
    return record && record.isBulk;
  });

  if (selectedBulkItems.length === 0) {
    showCustomAlert('No Bulk Sessions Selected', 'No bulk session records to delete.');
    return;
  }

  // Find the records that will be deleted before filtering
  const recordsToBeDeleted = [];
  for (const timestamp of selectedBulkItems) {
    const record = history.searches.find(s => s.timestamp === timestamp && s.isBulk);
    if (record) {
      recordsToBeDeleted.push(record);
    }
  }

  // Remove only selected bulk session records from history
  history.searches = history.searches.filter(s => !selectedBulkItems.includes(s.timestamp));

  // Also remove associated bulk resume keys from localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('bulk_resume_')) {
      // Check if this key is related to any of the records being deleted
      for (const record of recordsToBeDeleted) {
        if (record.bulkData && record.bulkData.niche && Array.isArray(record.bulkData.queries)) {
          // Reconstruct the expected resume key based on the record's niche and queries
          const expectedResumeKey = `bulk_resume_${record.bulkData.niche}_${record.bulkData.queries.join('_').substring(0, 50)}`;

          // Since the queries part might be truncated, match by the beginning
          if (key.startsWith(expectedResumeKey) ||
            (key.startsWith(`bulk_resume_${record.bulkData.niche}_`) &&
              record.bulkData.queries.some(query => key.includes(query.substring(0, 10))))) {
            keysToRemove.push(key);
            break; // Found a match, no need to check other records for this key
          }
        }
      }
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Save updated history
  await window.electronAPI.saveHistory(history);

  // Clear selection for the deleted items only
  selectedBulkItems.forEach(timestamp => {
    selectedHistoryItems.delete(timestamp);
  });

  // Update UI
  renderHistory();
  updateStats();

  showCustomAlert('Bulk Sessions Deleted', `Successfully deleted ${selectedBulkItems.length} bulk session record(s).`);
}

function showCustomAlert(title, message) {
  // Simple custom alert using existing modal structure
  const alertHtml = `
    <div class="modal show" id="customAlertModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="btn-icon" onclick="document.getElementById('customAlertModal').remove()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="text-align: center; color: var(--text-secondary); white-space: pre-line;">${message}</p>
          <div style="display: flex; justify-content: center; margin-top: 20px;">
            <button class="btn-primary" onclick="document.getElementById('customAlertModal').remove()">OK</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', alertHtml);
}
