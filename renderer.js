let scrapedData = [];
let history = { searches: [] };
let bulkQueries = [];
let isBulkMode = false;
let isScrapingActive = false;
let map;
let marker;
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
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
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
const combineAllBtn = document.getElementById('combineAllBtn');
const selectAllLink = document.getElementById('selectAllLink');
const exportSelectedBtn = document.getElementById('exportSelectedBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

// Settings Elements
const headlessModeCheckbox = document.getElementById('headlessMode');
const defaultExportFormatSelect = document.getElementById('defaultExportFormat');
const autoSaveResultsCheckbox = document.getElementById('autoSaveResults');
const saveHistoryDataCheckbox = document.getElementById('saveHistoryData');
const defaultExportPathInput = document.getElementById('defaultExportPath');
const selectExportFolderBtn = document.getElementById('selectExportFolderBtn');
const developerModeCheckbox = document.getElementById('developerMode');

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
startBtn.addEventListener('click', startScraping);
stopBtn.addEventListener('click', stopScraping);
exportBtn.addEventListener('click', exportData);
clearResultsBtn.addEventListener('click', clearResults);
combineAllBtn.addEventListener('click', combineAllHistory);

// Selection Event Listeners
selectAllLink.addEventListener('click', (e) => {
  e.preventDefault();
  toggleSelectAll();
});
exportSelectedBtn.addEventListener('click', () => {
  document.getElementById('exportOptionsModal').classList.add('show');
});
deleteSelectedBtn.addEventListener('click', () => {
  const count = selectedHistoryItems.size;
  document.getElementById('deleteCount').textContent = count;
  document.getElementById('deleteConfirmModal').classList.add('show');
});

// Settings Event Listeners
document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('settingsModal').classList.add('show');
});

document.getElementById('closeSettingsBtn').addEventListener('click', () => {
  document.getElementById('settingsModal').classList.remove('show');
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

document.getElementById('performanceMode').addEventListener('change', (e) => {
  const isChecked = e.target.checked;
  localStorage.setItem('performanceMode', isChecked);
});

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

autoSaveResultsCheckbox.addEventListener('change', (e) => {
  localStorage.setItem('autoSaveResults', e.target.checked);
});

saveHistoryDataCheckbox.addEventListener('change', (e) => {
  localStorage.setItem('saveHistoryData', e.target.checked);
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

// Default Export Folder
selectExportFolderBtn.addEventListener('click', async () => {
  const result = await window.electronAPI.selectFolder();
  if (result && !result.cancelled) {
    localStorage.setItem('defaultExportPath', result.filePath);
    defaultExportPathInput.value = result.filePath;
  }
});

// Export Options Modal Event Listeners
document.getElementById('closeExportOptionsBtn').addEventListener('click', () => {
  document.getElementById('exportOptionsModal').classList.remove('show');
});

document.getElementById('exportSingleCsvBtn').addEventListener('click', () => {
  document.getElementById('exportOptionsModal').classList.remove('show');
  exportSelectedRecords('single');
});

document.getElementById('exportSeparateCsvBtn').addEventListener('click', () => {
  document.getElementById('exportOptionsModal').classList.remove('show');
  exportSelectedRecords('separate');
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
  deleteSelectedRecords();
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
  } else {
    singleMode.style.display = 'block';
    bulkMode.style.display = 'none';
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
  if (!history.searches || history.searches.length === 0) {
    historyContainer.innerHTML = '<p class="empty-text">No history yet</p>';
    combineAllBtn.style.display = 'none';
    selectAllLink.style.display = 'none';
    exportSelectedBtn.style.display = 'none';
    deleteSelectedBtn.style.display = 'none';
    return;
  }

  // Show combine all button
  combineAllBtn.style.display = 'flex';

  // Show selection controls
  selectAllLink.style.display = 'inline';
  selectAllLink.textContent = 'Select All';
  updateSelectionUI();

  historyContainer.innerHTML = history.searches
    .slice(-10)
    .reverse()
    .map(item => {
      const statusLabel = item.status === 'cancelled' ? '<span class="status-badge cancelled">Cancelled</span>' : '';
      const resumeBtn = item.status === 'cancelled' && item.isBulk ?
        `<button class="btn-icon resume-bulk" title="Resume bulk scraping" data-query="${escapeHtml(item.query)}" data-timestamp="${item.timestamp}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>` : '';

      const isChecked = selectedHistoryItems.has(item.timestamp) ? 'checked' : '';

      return `
      <div class="history-item clickable has-checkbox" data-query="${escapeHtml(item.query)}" data-timestamp="${item.timestamp}">
        <input type="checkbox" class="history-checkbox" data-timestamp="${item.timestamp}" ${isChecked}>
        <div class="history-content">
          <div class="history-query">${escapeHtml(item.query)} ${statusLabel}</div>
          <div class="history-meta">
            ${item.count} results • ${new Date(item.timestamp).toLocaleString()}
          </div>
        </div>
        <div class="history-actions">
          ${resumeBtn}
          <button class="btn-icon export-history" title="Export this record">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  // Add checkbox change handlers
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

      // Update select all checkbox
      const allCheckboxes = document.querySelectorAll('.history-checkbox');
      const allChecked = Array.from(allCheckboxes).every(c => c.checked);
      // selectAllHistory.checked = allChecked; // Removed as selectAllHistory is not defined
    });
  });

  // Add click handlers for history items to display results
  document.querySelectorAll('.history-item.clickable').forEach(item => {
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

      // Scroll to results section
      document.querySelector('.results-section').scrollIntoView({ behavior: 'smooth' });

      // Highlight the selected history item
      document.querySelectorAll('.history-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
    });
  });

  // Add click handlers for resume buttons
  document.querySelectorAll('.resume-bulk').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const query = btn.dataset.query;
      const timestamp = btn.dataset.timestamp;

      // Find the matching history record
      const record = history.searches.find(s => s.query === query && s.timestamp === timestamp);
      if (!record || !record.bulkData) return;

      showCustomAlert('Resume Bulk Scraping', `Resume scraping for "${record.bulkData.niche}"?\n\nThis will continue from where it was cancelled.`);

      // Restore bulk mode state
      bulkModeToggle.checked = true;
      toggleBulkMode();
      bulkNicheInput.value = record.bulkData.niche;
      bulkQueries = record.bulkData.remainingQueries;
      bulkQueriesInput.value = bulkQueries.join('\n');
      updateBulkPreview();

      // Start scraping
      await startBulkScraping();
    });
  });

  // Add click handlers for history item exports
  document.querySelectorAll('.export-history').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const historyItem = e.target.closest('.history-item');
      const query = historyItem.dataset.query;
      const timestamp = historyItem.dataset.timestamp;

      // Find the matching history record
      const record = history.searches.find(s => s.query === query && s.timestamp === timestamp);
      if (!record) return;

      const format = exportFormatSelect.value;
      const filename = `google-maps-history-${new Date(timestamp).toISOString().slice(0, 10)}.${format}`;

      const result = await window.electronAPI.exportData({
        data: record.data || [],
        format,
        filename
      });

      if (result.success && !result.cancelled) {
        showCustomAlert('Export Successful', `History data exported to:\n${result.filePath}`);
      } else if (!result.cancelled) {
        showCustomAlert('Export Failed', result.error);
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
    alert('Please fill in both Niche and Location fields');
    return;
  }

  // Get preposition from dropdown
  let preposition = searchPrepositionSingle.value;
  if (preposition === 'custom') {
    preposition = customPrepositionSingle.value.trim() || 'in';
  }
  const query = `${niche} ${preposition} ${location}`;

  if (isAlreadyScraped(query)) {
    const proceed = confirm(
      `You've already scraped "${query}" before.\n\nDo you want to scrape it again?`
    );
    if (!proceed) return;
  }

  // Show stop button, hide start
  isScrapingActive = true;
  startBtn.style.display = 'none';
  stopBtn.style.display = 'flex';

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

  // Reset buttons
  isScrapingActive = false;
  startBtn.style.display = 'flex';
  stopBtn.style.display = 'none';

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

    if (autoSaveResultsCheckbox.checked) {
      exportData();
    }

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

async function startBulkScraping() {
  const niche = bulkNicheInput.value.trim();

  if (!niche) {
    alert('Please enter a business niche');
    return;
  }

  if (bulkQueries.length === 0) {
    alert('Please upload a CSV file or enter queries manually');
    return;
  }

  // Show stop button
  isScrapingActive = true;
  startBtn.style.display = 'none';
  stopBtn.style.display = 'flex';

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

  // Check if fast mode is selected to enable parallel processing
  const isFastMode = speedSelect.value === 'fast';

  if (isFastMode) {
    // Process queries in parallel (up to 2 at a time) for fast mode
    for (let i = startIndex; i < bulkQueries.length; i += 2) {
      if (!isScrapingActive) {
        // Save current index for resume
        localStorage.setItem(resumeKey, i.toString());
        break;
      }

      // Process up to 2 queries in parallel
      const queryPromises = [];
      const maxParallel = Math.min(2, bulkQueries.length - i);

      for (let j = 0; j < maxParallel; j++) {
        const queryIndex = i + j;
        if (queryIndex >= bulkQueries.length) break;

        const location = bulkQueries[queryIndex];
        // Get preposition from dropdown
        let preposition = searchPrepositionBulk.value;
        if (preposition === 'custom') {
          preposition = customPrepositionBulk.value.trim() || 'in';
        }
        const query = `${niche} ${preposition} ${location}`;

        // Update progress to show current batch
        currentQuery.textContent = queryIndex + 1;
        currentSearchQuery.textContent = query;

        progressText.textContent = `Processing: ${query}`;
        progressFill.style.width = `${((queryIndex / bulkQueries.length) * 100)}%`;

        const options = {
          niche,
          location,
          speed: speedSelect.value,
          extractEmails: extractEmailsBulkCheckbox.checked,
          headless: headlessModeCheckbox.checked
        };

        // Create a promise for this query
        const queryPromise = new Promise(async (resolve) => {
          try {
            if (!isScrapingActive) {
              localStorage.setItem(resumeKey, queryIndex.toString());
              resolve();
              return;
            }

            const result = await window.electronAPI.startScraping(options);

            if (!isScrapingActive) {
              localStorage.setItem(resumeKey, queryIndex.toString());
              resolve();
              return;
            }

            if (result.stopped) {
              localStorage.setItem(resumeKey, queryIndex.toString());
              isScrapingActive = false;
              resolve();
              return;
            }

            if (result.success && result.data.length > 0) {
              const dataWithQuery = result.data.map(item => ({
                ...item,
                search_query: query,
                search_location: location
              }));

              // Use a lock or mutex pattern to safely update shared data
              scrapedData.push(...dataWithQuery);
              totalResults += result.data.length;

              // Add to history immediately after each query
              history.searches.push({
                query,
                count: result.data.length,
                timestamp: new Date().toISOString(),
                data: dataWithQuery // Save the actual data
              });

              // Save history after each query
              await window.electronAPI.saveHistory(history);

              // Update progress for this specific query
              if (isScrapingActive) {
                progressText.textContent = `✓ ${query}: Found ${result.data.length} businesses (Total: ${scrapedData.length})`;
                progressText.style.color = 'var(--success)';
              }
            } else if (isScrapingActive) {
              progressText.textContent = `⚠ ${query}: No results found`;
              progressText.style.color = 'var(--warning)';
            }
          } catch (error) {
            console.error(`Error scraping ${query}:`, error);
            if (isScrapingActive) {
              progressText.textContent = `✗ ${query}: Error occurred`;
              progressText.style.color = 'var(--error)';
            }
          } finally {
            // Update UI after each completed query (but not too frequently to avoid performance issues)
            if (isScrapingActive) {
              renderHistory();
              renderResults(scrapedData);
              updateStats();
            }
            resolve();
          }
        });

        queryPromises.push(queryPromise);
      }

      // Wait for all queries in this batch to complete before starting the next batch
      await Promise.all(queryPromises);
      
      // Update progress after each batch
      const currentProgress = Math.min(i + maxParallel, bulkQueries.length);
      progressFill.style.width = `${((currentProgress / bulkQueries.length) * 100)}%`;
      
      // Small delay between batches to prevent overwhelming
      if (isScrapingActive) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } else {
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
        speed: speedSelect.value,
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

          // Add to history immediately after each query
          history.searches.push({
            query,
            count: result.data.length,
            timestamp: new Date().toISOString(),
            data: dataWithQuery // Save the actual data
          });

          // Save history after each query
          await window.electronAPI.saveHistory(history);

          // Update UI immediately
          renderHistory();
          renderResults(scrapedData);
          updateStats();

          progressText.textContent = `✓ ${query}: Found ${result.data.length} businesses (Total: ${scrapedData.length})`;
          progressText.style.color = 'var(--success)';
        } else {
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

  const wasCancelled = !isScrapingActive;
  const currentIndex = parseInt(localStorage.getItem(resumeKey) || '0');

  // Clear resume data on completion
  if (isScrapingActive) {
    localStorage.removeItem(resumeKey);
  }

  // Reset buttons
  isScrapingActive = false;
  startBtn.style.display = 'flex';
  stopBtn.style.display = 'none';

  progressFill.style.width = '100%';

  if (scrapedData.length > 0) {
    if (wasCancelled && currentIndex < bulkQueries.length) {
      // Save cancelled bulk operation to history with resume data
      const remainingQueries = bulkQueries.slice(currentIndex);
      history.searches.push({
        query: `Bulk: ${niche} (${currentIndex}/${bulkQueries.length} completed)`,
        count: scrapedData.length,
        timestamp: new Date().toISOString(),
        data: scrapedData,
        status: 'cancelled',
        isBulk: true,
        bulkData: {
          niche,
          remainingQueries,
          completedCount: currentIndex
        }
      });
      await window.electronAPI.saveHistory(history);
      renderHistory();
      updateStats();

      progressText.textContent = `⏸ Cancelled. Scraped ${scrapedData.length} businesses (${currentIndex}/${bulkQueries.length} queries completed)`;
      progressText.style.color = 'var(--warning)';
    } else {
      progressText.textContent = `✓ Completed! Scraped ${scrapedData.length} businesses in total`;
      progressText.style.color = 'var(--success)';
      if (autoSaveResultsCheckbox.checked) {
        exportData();
      }
    }
  } else {
    progressText.textContent = '⏸ Scraping stopped.';
    progressText.style.color = 'var(--text-secondary)';
  }

  // Final save
  await window.electronAPI.saveHistory(history);
  renderHistory();
  updateStats();
}

async function stopScraping() {
  if (!isScrapingActive) return;

  const confirmed = confirm('Are you sure you want to stop scraping?\n\nYou will keep the data scraped so far.');

  if (confirmed) {
    isScrapingActive = false;
    await window.electronAPI.stopScraping();

    progressText.textContent = '⏸ Stopping scraper...';
    progressText.style.color = 'var(--warning)';
  }
}

function isAlreadyScraped(query) {
  return history.searches.some(item => item.query.toLowerCase() === query.toLowerCase());
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
    updateStats();
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

  if (confirm('Are you sure you want to clear the current results?')) {
    scrapedData = [];
    resultsContainer.innerHTML = '<div class="empty-state"><p>No results yet</p></div>';
    resultsActions.style.display = 'none';

    // Reset stats
    document.getElementById('totalCompanies').textContent = '0';
    document.getElementById('totalWebsites').textContent = '0';
    document.getElementById('totalPhones').textContent = '0';

    // Reset progress
    progressText.textContent = 'Ready to scrape';
    progressFill.style.width = '0%';
    if (progressPercent) progressPercent.textContent = '0%';
  }
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

  // Check for default export path
  const defaultPath = localStorage.getItem('defaultExportPath');

  const result = await window.electronAPI.exportData({
    data: scrapedData,
    format,
    filename,
    defaultPath: defaultPath || null
  });

  if (result.success && !result.cancelled) {
    alert(`Data exported successfully to:\n${result.filePath}`);
  } else if (!result.cancelled) {
    alert(`Export failed: ${result.error}`);
  }
}

async function combineAllHistory() {
  if (!history.searches || history.searches.length === 0) {
    alert('No history data to export');
    return;
  }

  // Combine all history data
  const combinedData = [];
  history.searches.forEach(search => {
    if (search.data && Array.isArray(search.data)) {
      combinedData.push(...search.data);
    }
  });

  if (combinedData.length === 0) {
    alert('No data found in history to export');
    return;
  }

  const format = exportFormatSelect.value;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `google-maps-combined-history-${timestamp}.${format}`;

  const result = await window.electronAPI.exportData({
    data: combinedData,
    format,
    filename
  });

  if (result.success && !result.cancelled) {
    alert(`Combined history data exported successfully!\\n\\nTotal records: ${combinedData.length}\\nFile: ${result.filePath}`);
  } else if (!result.cancelled) {
    alert(`Export failed: ${result.error}`);
  }
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

  // Initialize performance mode
  const performanceMode = localStorage.getItem('performanceMode') === 'true';
  document.getElementById('performanceMode').checked = performanceMode;

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

  // Initialize auto-save
  const autoSave = localStorage.getItem('autoSaveResults') === 'true';
  autoSaveResultsCheckbox.checked = autoSave;

  // Initialize save history data
  const saveHistoryData = localStorage.getItem('saveHistoryData') !== 'false';
  document.getElementById('saveHistoryData').checked = saveHistoryData;

  // Initialize default export path
  const defaultPath = localStorage.getItem('defaultExportPath') || '';
  defaultExportPathInput.value = defaultPath;

  // Initialize Developer Mode
  const developerMode = localStorage.getItem('developerMode') === 'true';
  if (developerModeCheckbox) {
    developerModeCheckbox.checked = developerMode;
  }
}

function updateStats() {
  const statsSection = document.querySelector('.stats-section');
  if (!statsSection) return;

  let totalCompanies = 0;
  let totalWebsites = 0;
  let totalPhones = 0;
  let lastUpdate = '-';

  if (history.searches && history.searches.length > 0) {
    history.searches.forEach(search => {
      if (search.data) {
        totalCompanies += search.data.length;
        totalWebsites += search.data.filter(item => item.website).length;
        totalPhones += search.data.filter(item => item.phone).length;
      }
    });

    // Get the most recent timestamp
    const lastTimestamp = Math.max(...history.searches.map(s => new Date(s.timestamp)));
    lastUpdate = new Date(lastTimestamp).toLocaleDateString();
  }

  document.getElementById('totalCompanies').textContent = totalCompanies.toLocaleString();
  document.getElementById('totalWebsites').textContent = totalWebsites.toLocaleString();
  document.getElementById('totalPhones').textContent = totalPhones.toLocaleString();
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
  map = L.map('map-container').setView([40.7128, -74.0060], 13);

  // Add OpenStreetMap tiles (free and no authentication required)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

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
  const checkboxes = document.querySelectorAll('.history-checkbox');
  const allSelected = selectedHistoryItems.size === checkboxes.length && checkboxes.length > 0;

  if (allSelected) {
    // Deselect all
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
    selectedHistoryItems.clear();
    selectAllLink.textContent = 'Select All';
  } else {
    // Select all
    checkboxes.forEach(cb => {
      cb.checked = true;
      selectedHistoryItems.add(cb.dataset.timestamp);
    });
    selectAllLink.textContent = 'Deselect All';
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  const count = selectedHistoryItems.size;
  if (count > 0) {
    exportSelectedBtn.style.display = 'flex';
    deleteSelectedBtn.style.display = 'flex';
    combineAllBtn.style.display = 'none';
  } else {
    exportSelectedBtn.style.display = 'none';
    deleteSelectedBtn.style.display = 'none';
    combineAllBtn.style.display = history.searches && history.searches.length > 0 ? 'flex' : 'none';
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

  // Remove selected records from history
  history.searches = history.searches.filter(s => !selectedHistoryItems.has(s.timestamp));

  // Save updated history
  await window.electronAPI.saveHistory(history);

  // Clear selection
  selectedHistoryItems.clear();

  // Update UI
  renderHistory();
  updateStats();

  showCustomAlert('Records Deleted', `Successfully deleted ${timestamps.length} record(s).`);
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
