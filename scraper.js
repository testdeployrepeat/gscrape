const puppeteerCore = require('puppeteer-core');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { getChromePath } = require('./chrome-path');

// Wrap puppeteer-core with puppeteer-extra
const puppeteer = puppeteerExtra.addExtra(puppeteerCore);
puppeteer.use(StealthPlugin());

let shouldStop = false;

// Helper function for waiting
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stopScraping() {
  shouldStop = true;
}

function resetStopper() {
  shouldStop = false;
}

function resetStopper() {
  shouldStop = false;
}

/**
 * NEW: Clicks the consent button that can appear on first load.
 */
async function handleConsent(page) {
  try {
    // Try multiple strategies to find the consent button
    const strategies = [
      // Strategy 1: Common aria-labels
      'button[aria-label="Accept all"]',
      'button[aria-label="I agree"]',
      'button[aria-label="Agree to the use of cookies and other data for the purposes described"]',

      // Strategy 2: Forms with specific actions
      'form[action*="consent"] button',
      'form[action*="consent"] input[type="submit"]'
    ];

    // Try CSS selectors first
    for (const selector of strategies) {
      if (await page.$(selector)) {
        await page.click(selector);
        console.log('Consent button clicked via CSS selector:', selector);
        await wait(2000);
        return true;
      }
    }

    // Strategy 3: Text content matching (Multi-language support)
    // English: Accept all, I agree, Accept
    // French: Tout accepter, J'accept, Accepter
    // German: Alle akzeptieren, Ich stimme zu, Akzeptieren
    // Spanish: Aceptar todo, Acepto, Aceptar
    // Italian: Accetta tutto, Accetto, Accetta
    const textXpath = `//button[
      contains(., 'Accept all') or contains(., 'I agree') or contains(., 'Accept') or
      contains(., 'Tout accepter') or contains(., 'J''accepte') or contains(., 'Accepter') or
      contains(., 'Alle akzeptieren') or contains(., 'Ich stimme zu') or contains(., 'Akzeptieren') or
      contains(., 'Aceptar todo') or contains(., 'Acepto') or contains(., 'Aceptar') or
      contains(., 'Accetta tutto') or contains(., 'Accetto') or contains(., 'Accetta')
    ]`;

    const buttons = await page.$x(textXpath);
    if (buttons.length > 0) {
      // Click the last one as it's usually the primary action in the visible layer
      await buttons[buttons.length - 1].click();
      console.log('Consent button clicked via XPath (text match).');
      await wait(2000);
      return true; // Return true to indicate consent was handled
    }

    // Strategy 4: Span text match inside likely buttons (Same languages)
    const spanXpath = `//span[
      contains(., 'Accept all') or contains(., 'I agree') or
      contains(., 'Tout accepter') or contains(., 'J''accepte') or
      contains(., 'Alle akzeptieren') or contains(., 'Ich stimme zu') or
      contains(., 'Aceptar todo') or contains(., 'Acepto') or
      contains(., 'Accetta tutto') or contains(., 'Accetto')
    ]`;

    const spans = await page.$x(spanXpath);
    if (spans.length > 0) {
      await spans[0].click();
      console.log('Consent clicked via span text match.');
      await wait(2000);
      return true; // Return true to indicate consent was handled
    }

    return false; // No consent handled
  } catch (error) {
    // It's normal to fail if there is no consent banner
    console.log('Consent screen check check finished (may not verify if one existed).');
    return false;
  }
}


/**
 * Scrolls the main results panel on Google Maps until the end is reached.
 * Uses event-driven scrolling with content-aware waiting for optimal speed.
 */
async function scrollResultsFeed(page, speed) {
  // Updated selector to catch multiple possible selectors Google uses
  const scrollableElementSelectors = [
    'div[aria-label^="Results for"]',
    'div[role="feed"]',
    'div.m6QErb[role="feed"]',
    'div[role="main"] div[role="feed"]'
  ];

  let scrollableElement;
  let selectedSelector;

  // Try multiple selectors to find the scrollable element
  for (const selector of scrollableElementSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      scrollableElement = await page.$(selector);
      if (scrollableElement) {
        selectedSelector = selector;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!scrollableElement) {
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes("Google Maps can't find") || bodyText.includes("No results found")) {
      console.log("Query returned no results, continuing...");
      return; // This is not a failure, just an empty search result.
    }
    throw new Error("Could not find the results list to scroll. The page layout may have changed or the page is blocked.");
  }

  // Smart wait: Wait for items to appear instead of fixed delay
  try {
    // Wait up to 3 seconds for at least one result item to load
    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        return el && el.querySelectorAll('a[href*="/maps/place/"]').length > 0;
      },
      { timeout: 3000, polling: 200 },
      selectedSelector
    );
  } catch (e) {
    // If timeout, just proceed - the scrolling loop handles loading more content
    console.log("Initial load timeout - proceeding to scroll loop");
  }

  // Event-driven scrolling with exponential backoff
  let lastItemsCount = 0;
  let noChangeCount = 0;
  let currentDelay = 300; // Start with fast 300ms delay
  const maxDelay = 2500; // Cap at 2.5 seconds for slow connections
  const delayMultiplier = 1.5; // Exponential backoff factor
  const maxNoChangeAttempts = 5; // Reduced from 10 to 5 for faster end detection
  let totalScrollAttempts = 0;
  const maxTotalAttempts = 100; // Increased safety limit to allow more scrolling
  let hasSeenEndText = false; // Track if we've seen the "end of list" text

  while (!shouldStop && totalScrollAttempts < maxTotalAttempts) {
    totalScrollAttempts++;

    // Get current state and scroll
    const result = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return { error: 'Element not found' };

      const items = document.querySelectorAll('div[role="feed"] > div > div[jsaction] a[href*="/maps/place/"]').length;
      const fullText = element.innerText || '';
      const previousScrollTop = element.scrollTop;

      // Scroll to bottom aggressively
      element.scrollTop = element.scrollHeight;

      // Check for end-of-list indicator (primary stop condition)
      const hasEndText = fullText.includes("You've reached the end of the list");

      return {
        items,
        hasEndText,
        scrollChanged: element.scrollTop !== previousScrollTop,
        isAtBottom: element.scrollHeight - element.scrollTop <= element.clientHeight + 100
      };
    }, selectedSelector);

    if (result.error) break;

    // PRIMARY STOP CONDITION: "You've reached the end of the list." text
    if (result.hasEndText) {
      console.log(`Scrolling stopped - end of list detected. Total: ${result.items} items.`);
      hasSeenEndText = true;
      break;
    }

    // Check if new items loaded
    if (result.items > lastItemsCount) {
      // New content loaded - reset counters
      lastItemsCount = result.items;
      noChangeCount = 0;
      currentDelay = 300; // Reset to fast delay
      console.log(`Found ${result.items} items...`);
    } else {
      // No new items - might be still loading or at end
      noChangeCount++;

      // Be more patient when we haven't seen the end text yet
      // Only use no-change as fallback safety net after many attempts
      const effectiveMaxAttempts = maxNoChangeAttempts;

      // Only stop after many failed attempts at maximum delay (fallback for edge cases)
      if (noChangeCount >= effectiveMaxAttempts && currentDelay >= maxDelay) {
        console.log(`Scrolling stopped - no new items after ${effectiveMaxAttempts} attempts (end text not found). Total: ${lastItemsCount} items.`);
        break;
      }

      // Increase delay with exponential backoff (content might still be loading)
      currentDelay = Math.min(currentDelay * delayMultiplier, maxDelay);
    }

    // Wait for content to load - use shorter waits when content is actively loading
    try {
      // Try to detect new content appearing (faster than fixed delay)
      await page.waitForFunction(
        (selector, prevCount) => {
          const items = document.querySelectorAll('div[role="feed"] > div > div[jsaction] a[href*="/maps/place/"]').length;
          return items > prevCount;
        },
        { timeout: currentDelay },
        selectedSelector,
        lastItemsCount
      );
      // Content appeared - reset delay
      currentDelay = 300;
      noChangeCount = 0; // Also reset no-change counter
    } catch (e) {
      // Timeout - no new content appeared, will check on next iteration
    }

    // Small buffer to allow DOM updates
    await wait(100);
  }

  // Final safety: if we only got a tiny amount, try one more aggressive scroll
  if (lastItemsCount < 15 && !shouldStop) {
    console.log('Low item count detected, attempting recovery scroll...');
    await wait(1000);
    for (let i = 0; i < 3; i++) {
      await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) element.scrollTop = element.scrollHeight;
      }, selectedSelector);
      await wait(800);
    }
  }
}


/**
 * The main scraping function.
 */
async function scrapeGoogleMaps(options, progressCallback) {
  const {
    niche,
    location,
    speed = 'normal',
    extractEmails = false,
    headless = true
  } = options;

  const searchQuery = `${niche} in ${location}`;
  const scrapedLinks = new Set();

  // shouldStop = false; // MOVED: Handled via resetStopper() to support parallel scraping

  progressCallback({ status: 'starting', message: 'Launching browser...' });

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
      '--disable-blink-features=AutomationControlled',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-ipc-flooding-protection',
      '--memory-pressure-off',
      '--max_old_space_size=4096'
    ],
    ignoreHTTPSErrors: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Set a more recent, realistic user agent
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);

    // Add additional stealth measures
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // Add extra headers to mimic real browser behavior
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Upgrade-Insecure-Requests': '1',
      'DNT': '1',
    });

    // Set permissions to avoid permission prompts
    await page.setGeolocation({ latitude: 41.8781, longitude: -87.6298 }); // Chicago as default
    await page.evaluateOnNewDocument(() => {
      delete navigator.__proto__.webdriver;
    });

    // Close the default about:blank tab that Puppeteer creates
    const pages = await browser.pages();
    if (pages.length > 1) {
      // Find and close about:blank tab
      for (const p of pages) {
        const url = p.url();
        if (url === 'about:blank' || url === '') {
          await p.close().catch(() => { }); // Ignore errors
          break;
        }
      }
    }

    if (shouldStop) throw new Error('Scraping cancelled by user');

    progressCallback({ status: 'navigating', message: `Searching for "${searchQuery}"...` });

    // Use a more reliable navigation method with timeout
    try {
      await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, {
        waitUntil: 'domcontentloaded', // Change to domcontentloaded for faster initial load
        timeout: 60000 // Standard timeout of 1 minute
      });
    } catch (navigationError) {
      if (navigationError.name === 'TimeoutError') {
        console.log('Navigation timeout occurred, but continuing with page that partially loaded...');
        // Continue execution as some content might have loaded
      } else {
        throw navigationError; // Re-throw if it's not a timeout error
      }
    }

    // Race condition: Wait for EITHER results to load OR consent banner to appear
    // This is much faster than waiting for timeout
    const resultsSelector = 'div[role="feed"], div[aria-label^="Results for"], #searchbox';
    // Use common consent indicators for the race
    const consentSelector = 'button[aria-label="Accept all"], button[aria-label*="Agree"], form[action*="consent"]';

    try {
      // First race: fast check
      const result = await Promise.race([
        page.waitForSelector(resultsSelector, { timeout: 10000 }).then(() => 'results'),
        page.waitForSelector(consentSelector, { timeout: 5000 }).then(() => 'consent'),
        // Fallback: check for text if selector fails (using function since waitForXpath is deprecated/removed in some versions)
        page.waitForFunction(() => {
          const text = document.body.innerText;
          return text.includes('Before you continue') || text.includes('Avant de continuer') || text.includes('Bevor Sie fortfahren');
        }, { timeout: 5000 }).then(() => 'consent_text')
      ]).catch(e => 'timeout');

      if (result === 'consent' || result === 'consent_text') {
        console.log('Consent banner detected via race condition!');
        const handled = await handleConsent(page);
        if (handled) {
          // Pass this flag to renderer so it can show the EU warning
          progressCallback({ status: 'navigating', message: 'Consent accepted. Loading results...', requiresConsent: true });

          // Wait for results again after handling consent
          await page.waitForSelector(resultsSelector, { timeout: 10000 });
        }
      } else if (result === 'timeout') {
        // If race timed out (neither found quickly), try robust consent check one more time
        console.log('Initial race timed out, performing robust consent check...');
        const handled = await handleConsent(page);
        if (handled) {
          progressCallback({ status: 'navigating', message: 'Consent accepted. Loading results...', requiresConsent: true });
        }
        // Then wait for results strictly
        await page.waitForSelector(resultsSelector, { timeout: 10000 });
      }
      // If result === 'results', we're good to go!

    } catch (e) {
      console.log('Error during startup sequence, trying final fallback...');
      // Final fallback: just try to find results or throw
      try {
        await page.waitForSelector(resultsSelector, { timeout: 5000 });
      } catch (finalErr) {
        throw new Error('Unable to find search results. If you\'re scraping from EU, please use a VPN or non-EU proxy.');
      }
    }

    // SMART WAIT: Wait for actual business listings to appear instead of hard sleep
    // Reduced timeout and added safety check to skip if elements already exist
    try {
      const hasListings = await page.$('div[role="feed"] > div > div[jsaction]');
      if (!hasListings) {
        await page.waitForSelector('div[role="feed"] > div > div[jsaction]', { timeout: 4000 });
      }
    } catch (e) {
      // If items don't appear quickly, we continue to scrolling which has its own checks
      console.log('Timeout waiting for initial listings, proceeding to scroll...');
    }

    if (shouldStop) throw new Error('Scraping cancelled by user');

    progressCallback({ status: 'scrolling', message: 'Loading all results...' });
    await scrollResultsFeed(page, speed);

    // Check if we should stop before extraction
    if (shouldStop) throw new Error('Scraping cancelled by user');

    progressCallback({ status: 'extracting', message: 'Extracting business information from list...' });

    // Scrape everything possible from the list view for maximum speed.
    const businessesFromList = await page.evaluate((niche) => {
      const resultsArray = [];
      const businessCards = document.querySelectorAll('div[role="feed"] > div > div[jsaction]');

      businessCards.forEach(card => {
        const linkElement = card.querySelector('a[href*="/maps/place/"]');
        if (!linkElement) return;

        const data = {
          name: linkElement.getAttribute('aria-label') || '',
          link: linkElement.href,
          category: niche,
          address: '',
          phone: '',
          website: '',
          rating: '',
          reviews: ''
        };

        try {
          // Look for details container with multiple selector options
          let detailsContainer = card.querySelector('div.fontBodyMedium');
          if (!detailsContainer) {
            detailsContainer = card.querySelector('div[style*="line-height"]');
          }
          if (!detailsContainer) {
            detailsContainer = card.querySelector('div[role="button"] + div');
          }

          if (detailsContainer) {
            // RATING & REVIEWS
            const ratingSpan = card.querySelector('span[aria-label*="star"]');
            if (ratingSpan) {
              const ratingText = ratingSpan.parentElement.innerText;
              const ratingMatch = ratingText.match(/(\d\.\d+)/);
              const reviewMatch = ratingText.match(/\(([\d,]+)\)/);
              if (ratingMatch) data.rating = ratingMatch[1];
              if (reviewMatch) data.reviews = reviewMatch[1].replace(/,/g, '');
            }

            // Try different containers for contact info
            let infoDivs = detailsContainer.querySelectorAll(':scope > div');
            if (infoDivs.length === 0) {
              infoDivs = detailsContainer.querySelectorAll('*');
            }

            // WEBSITE - Try multiple approaches
            // 1. Look for data-item-id="authority" link
            let websiteLink = card.querySelector('a[data-item-id="authority"]');
            // 2. Look for aria-label containing "Website"
            if (!websiteLink) {
              websiteLink = card.querySelector('a[aria-label*="Website"]');
            }
            // 3. Look for any external link that's not Google/Maps
            if (!websiteLink) {
              const allLinks = card.querySelectorAll('a[href^="http"]');
              for (const link of allLinks) {
                if (!link.href.includes('google.com') && !link.href.includes('maps')) {
                  websiteLink = link;
                  break;
                }
              }
            }
            if (websiteLink) {
              data.website = websiteLink.href;
            }

            // ADDRESS, PHONE
            infoDivs.forEach(div => {
              const text = div.innerText;
              if (!text) return;

              const parts = text.split('·').map(p => p.trim());
              parts.forEach(part => {
                // First, extract phone numbers from the part if they exist
                const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
                const phoneMatch = part.match(phoneRegex);

                if (phoneMatch) {
                  data.phone = phoneMatch[0].trim();
                  // Remove the phone number from the part to avoid it being treated as address
                  const remainingText = part.replace(phoneMatch[0], '').trim();
                  // Also try to extract an address from what remains after removing the phone
                  if (remainingText && remainingText.length > 5) {
                    // Check if remaining text looks like an address
                    if (remainingText.toLowerCase().match(/(st\.?|street|ave\.?|avenue|rd\.?|road|blvd\.?|boulevard|dr\.?|drive|ln\.?|lane|way|pl\.?|place|cir\.?|circle|court|ct\.?|highway|hwy|pkwy|parkway|square|sq|terrace|ter|trail|trl|loop)/i)) {
                      data.address = remainingText.replace(/Open \d+ Hours?|Open now|Closes soon|Closed/gi, '').trim();
                    }
                  }
                }
                // If no phone number found, try to extract address
                else if (part.match(/\d/) && !part.includes('star')) {
                  // Skip ratings like "4.9(162)" or "4.9 (162)"
                  if (part.match(/^\d\.\d+\s*\(\d+\)/)) return;

                  // Skip opening hours/status that contain digits
                  if (part.match(/^(Opens|Closes|Temporarily|Permanently)\b/i)) return;
                  if (part.match(/^Open\b/i) && part.match(/(AM|PM|hours?|soon|now)/i)) return;

                  // Skip if it looks like a rating number
                  if (part.match(/^\d\.\d+$/)) return;

                  // Check if this looks like an address (contains common address indicators)
                  if (part.toLowerCase().match(/(st\.?|street|ave\.?|avenue|rd\.?|road|blvd\.?|boulevard|dr\.?|drive|ln\.?|lane|way|pl\.?|place|cir\.?|circle|court|ct\.?|highway|hwy|pkwy|parkway|square|sq|terrace|ter|trail|trl|loop)/i)) {
                    const cleanedAddress = part.replace(/Open \d+ Hours?|Open now|Closes soon|Closed/gi, '').trim();
                    if (cleanedAddress.length > 5 && !cleanedAddress.match(/^\d+$/)) {
                      data.address = cleanedAddress;
                    }
                  } else {
                    // If no clear address indicators, be more lenient but still check format
                    const cleanedAddress = part.replace(/Open \d+ Hours?|Open now|Closes soon|Closed/gi, '').trim();
                    if (cleanedAddress.length > 5 && !cleanedAddress.match(/^\d+$/) && !cleanedAddress.match(/^\d+\s*\(\d+\)$/)) {
                      data.address = cleanedAddress;
                    }
                  }
                }
              });
            });
          }



          if (data.name.trim()) {
            resultsArray.push(data);
          }
        } catch (e) {
          console.error('Error parsing a business card:', e);
        }
      });
      return resultsArray;
    }, niche);

    const uniqueBusinesses = [];
    businessesFromList.forEach(business => {
      if (!scrapedLinks.has(business.link)) {
        scrapedLinks.add(business.link);
        uniqueBusinesses.push(business);
      }
    });

    let finalResults = uniqueBusinesses;

    // STEP 1: Extract detailed info FIRST (uses the current page, must complete before email extraction)
    if (options.extractDetailedInfo) {
      progressCallback({
        status: 'processing',
        message: `Extracting detailed info from ${uniqueBusinesses.length} listings...`,
        total: uniqueBusinesses.length,
        data: uniqueBusinesses // Send current data
      });

      await extractDetailedInfo(page, finalResults, speed, progressCallback);
    }

    // STEP 2: Extract emails AFTER detailed info (opens new pages, so must be after)
    if (extractEmails && finalResults.length > 0) {
      progressCallback({
        status: 'processing',
        message: `Extracting emails from ${finalResults.filter(r => r.website).length} websites...`
      });

      await extractEmailsInParallel(browser, finalResults, speed, progressCallback, options.emailScrapingLimit, options.deepEmailExtraction);
    }

    // Post-processing: Clean up any phone fields that contain addresses
    finalResults = finalResults.map(business => {
      // If phone field contains both address and phone, separate them
      if (business.phone && business.phone.includes('\n')) {
        const lines = business.phone.split('\n').map(line => line.trim()).filter(line => line);
        let cleanPhone = '';
        let potentialAddress = '';

        for (const line of lines) {
          // Check if line looks like a phone number
          if (line.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)) {
            cleanPhone = line; // Take the phone number line
          } else {
            // If not a phone, assume it's an address
            potentialAddress = line;
          }
        }

        // If we have a clean phone and no address yet, assign the address part
        if (cleanPhone) {
          business.phone = cleanPhone;
        }
        if (potentialAddress && !business.address) {
          business.address = potentialAddress;
        }
      }

      // Additional cleanup: if phone has address-like indicators, try to extract clean phone
      if (business.phone && !business.phone.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)) {
        // Extract phone number from text if it exists
        const phoneMatch = business.phone.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (phoneMatch) {
          const extractedPhone = phoneMatch[0].trim();
          // If we extracted a phone number that exists in the text, separate it
          const remainingText = business.phone.replace(extractedPhone, '').trim().replace(/\s+/g, ' ');
          if (remainingText && !business.address) {
            business.address = remainingText;
          }
          business.phone = extractedPhone;
        }
      }

      return business;
    });

    finalResults.forEach(b => delete b.link);

    if (shouldStop) {
      progressCallback({ status: 'stopped', message: `⏸ Scraping stopped. Extracted ${finalResults.length} businesses.` });
    } else {
      progressCallback({ status: 'complete', message: `✓ Successfully scraped ${finalResults.length} businesses!` });
    }

    return finalResults;

  } catch (error) {
    console.error('An error occurred during scraping:', error);
    const message = error.message.includes('cancelled') ? '⏸ Scraping stopped by user.' : `Error: ${error.message}`;
    progressCallback({ status: 'error', message });
    throw error;
  } finally {
    // Properly close the browser with timeout to prevent zombie processes
    if (browser) {
      try {
        // Check if browser is still connected before attempting to close
        if (typeof browser.isConnected === 'function' && !browser.isConnected()) {
          console.log('Browser already disconnected, skipping close operations');
          return;
        }

        // Close all pages first for cleaner shutdown
        const pages = await browser.pages();
        await Promise.all(pages.map(p => p.close().catch(() => { })));

        // Disconnect and close browser with 10-second timeout (increased from 3 seconds)
        await Promise.race([
          (async () => {
            await browser.close();
          })(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Browser close timeout')), 10000)
          )
        ]);
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
        // Force kill the browser process immediately to prevent zombie processes
        try {
          const process = browser.process();
          if (process && !process.killed) {
            process.kill('SIGKILL');
            console.log('Browser process forcefully killed to prevent zombie process');
          }
        } catch (killError) {
          console.error('Could not kill browser process:', killError);
        }
      }
    }
  }
}

async function extractEmailsInParallel(browser, results, speed, progressCallback, emailScrapingLimit, deepExtraction = false) {
  const websitesToScan = results.filter(r => r.website);
  if (websitesToScan.length === 0) return;

  progressCallback({ status: 'processing', message: `Searching ${websitesToScan.length} websites for emails...` });

  // Use the custom email scraping limit if provided, otherwise use the default based on speed
  const concurrency = emailScrapingLimit || (speed === 'fast' ? 10 : 5);
  const timeout = speed === 'fast' ? 14000 : 15000;

  let processedCount = 0;
  let currentIndex = 0;

  // Queue-based processing: maintain constant concurrency
  const workers = [];

  const processNext = async () => {
    while (currentIndex < websitesToScan.length && !shouldStop) {
      const business = websitesToScan[currentIndex++];

      try {
        business.email = await extractEmailFromWebsite(browser, business.website, timeout, deepExtraction) || '';
      } catch (error) {
        business.email = '';
      }

      processedCount++;
      progressCallback({
        status: 'processing',
        message: `Scanned ${processedCount}/${websitesToScan.length} websites for emails`
      });
    }
  };

  // Start concurrent workers
  for (let i = 0; i < concurrency; i++) {
    workers.push(processNext());
  }

  // Wait for all workers to complete
  await Promise.all(workers);
}

async function extractEmailFromWebsite(browser, websiteUrl, timeout, deepExtraction = false) {
  let page;
  try {
    page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Helper to extract emails from current page content
    const extractEmailsFromPage = async () => {
      return await page.evaluate(() => {
        // 1. Check mailto: links first (most reliable)
        const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
        if (mailtoLinks.length > 0) {
          return mailtoLinks[0].href.replace('mailto:', '').split('?')[0].trim();
        }

        // Helper to de-obfuscate text
        const deobfuscate = (text) => {
          return text
            .replace(/\s*\[at\]\s*/gi, '@')
            .replace(/\s*\(at\)\s*/gi, '@')
            .replace(/\s*\[dot\]\s*/gi, '.')
            .replace(/\s*\(dot\)\s*/gi, '.');
        };

        const bodyText = document.body.innerText;
        const cleanText = deobfuscate(bodyText);

        // 2. Enhanced regex: strict domain matching, excludes common file extensions
        // Matches: something@domain.tld (2+ chars for TLD)
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
        const matches = cleanText.match(emailRegex) || [];

        // 3. Filter out false positives
        const filtered = matches.filter(e => {
          const lower = e.toLowerCase();
          // Exclude image/file extensions that regex might mistakenly catch
          const invalidExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.js', '.css', '.woff', '.ttf'];
          if (invalidExtensions.some(ext => lower.endsWith(ext))) return false;

          // Exclude placeholder/system domains
          if (lower.includes('example.com')) return false;
          if (lower.includes('sentry.io')) return false;
          if (lower.includes('domain.com')) return false; // Common placeholder

          return true;
        });

        // 4. Prioritize common business email prefixes
        const priority = filtered.find(e => /^(info|contact|support|hello|admin|sales|team|office|enquiries)@/i.test(e));
        return priority || filtered[0] || '';
      });
    };

    // Try homepage first
    try {
      await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout });
    } catch (e) {
      // If homepage fails, we can't do much
      return '';
    }

    let email = await extractEmailsFromPage();

    // Deep extraction: Smart Contact Discovery
    if (deepExtraction && !email) {
      try {
        // Find the best candidate link for a contact page
        const contactLink = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          // Look for links with specific keywords
          const keywords = ['contact', 'get in touch', 'reach us', 'support', 'about'];

          // Score links based on their text and href
          const bestLink = links.reduce((best, link) => {
            const text = (link.innerText || '').toLowerCase();
            const href = (link.href || '').toLowerCase();

            // Skip invalid links
            if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href === window.location.href) {
              return best;
            }

            let score = 0;
            if (text.includes('contact')) score += 10;
            else if (text.includes('get in touch')) score += 8;
            else if (text.includes('support')) score += 5;
            else if (text.includes('about')) score += 2; // Lower priority for 'about' pages

            if (href.includes('contact')) score += 5;
            if (href.includes('about')) score += 1;

            if (score > (best.score || 0)) {
              return { element: link, score };
            }
            return best;
          }, { score: 0 });

          return bestLink.element ? bestLink.element.href : null;
        });

        if (contactLink) {
          // Navigate to the discovered contact page
          await page.goto(contactLink, {
            waitUntil: 'domcontentloaded',
            timeout: 10000 // Shorter timeout for contact page
          });

          // Try to extract email again from the new page
          email = await extractEmailsFromPage();
        }
      } catch (e) {
        // Navigation failed or page didn't load, ignore
      }
    }

    return email;
  } catch (error) {
    return '';
  } finally {
    if (page) await page.close();
  }
}

/**
 * OPTIMIZED: Extract detailed info only for listings MISSING phone or website.
 * Most listings already have this data from list view extraction, so we skip them.
 * This reduces extraction time from ~2 minutes to ~20-40 seconds.
 */
async function extractDetailedInfo(page, results, speed, progressCallback) {
  if (results.length === 0) return;

  // OPTIMIZATION: Only extract for listings missing phone OR website
  const listingsNeedingInfo = [];
  results.forEach((business, index) => {
    if (!business.phone || !business.website) {
      listingsNeedingInfo.push({ business, index });
    }
  });

  const skippedCount = results.length - listingsNeedingInfo.length;

  if (listingsNeedingInfo.length === 0) {
    progressCallback({
      status: 'processing',
      message: `Detailed info: All ${results.length} listings already have complete data, skipping extraction`
    });
    return;
  }

  progressCallback({
    status: 'processing',
    message: `Extracting detailed info from ${listingsNeedingInfo.length} of ${results.length} listings (${skippedCount} already complete)...`
  });

  let processedCount = 0;
  // OPTIMIZATION: Reduced delays - fast mode: 300ms, normal: 500ms (was 800ms/1200ms)
  const delayBetweenClicks = speed === 'fast' ? 300 : 500;

  const listingSelector = 'div[role="feed"] > div > div[jsaction] a[href*="/maps/place/"]';

  for (const { business, index } of listingsNeedingInfo) {
    if (shouldStop) break;

    try {
      // Click on the listing by its original index
      const clicked = await page.evaluate((selector, idx) => {
        const listings = document.querySelectorAll(selector);
        if (listings[idx]) {
          listings[idx].click();
          return true;
        }
        return false;
      }, listingSelector, index);

      if (!clicked) {
        processedCount++;
        continue;
      }

      // OPTIMIZATION: Shorter timeout (2s instead of 3s)
      try {
        await page.waitForSelector('[data-item-id*="phone"], a[data-item-id="authority"]', {
          timeout: 2000
        });
      } catch (e) {
        // Continue with extraction even if timeout
      }

      // OPTIMIZATION: Reduced wait (was delayBetweenClicks / 2)
      await wait(delayBetweenClicks);

      // Extract only the fields that are missing
      const needPhone = !business.phone;
      const needWebsite = !business.website;

      const detailedInfo = await page.evaluate((needPhone, needWebsite) => {
        const info = { phone: '', website: '' };

        if (needPhone) {
          // PHONE: Try data-item-id first (fastest, most reliable)
          const phoneEl = document.querySelector('[data-item-id*="phone:tel:"]');
          if (phoneEl) {
            const dataId = phoneEl.getAttribute('data-item-id');
            const match = dataId && dataId.match(/phone:tel:(.+)/);
            if (match) info.phone = match[1].trim();
          }
          // PHONE: Fallback to tel: link
          if (!info.phone) {
            const telLink = document.querySelector('a[href^="tel:"]');
            if (telLink) info.phone = telLink.href.replace('tel:', '').trim();
          }
        }

        if (needWebsite) {
          // WEBSITE: Look for authority link
          const websiteEl = document.querySelector('a[data-item-id="authority"]');
          if (websiteEl && websiteEl.href && !websiteEl.href.includes('google.com')) {
            info.website = websiteEl.href;
          }
        }

        return info;
      }, needPhone, needWebsite);

      // Update business with new info
      if (detailedInfo.phone && !business.phone) {
        business.phone = detailedInfo.phone;
      }
      if (detailedInfo.website && !business.website) {
        business.website = detailedInfo.website;
      }

      // Go back to results list
      await page.evaluate(() => {
        const backBtn = document.querySelector('button[aria-label*="Back" i], button[jsaction*="back"]');
        if (backBtn) backBtn.click();
      });

      // OPTIMIZATION: Reduced wait before next click
      await wait(delayBetweenClicks);

    } catch (err) {
      console.log(`Error processing listing ${index}:`, err.message);
    }

    processedCount++;
    if (processedCount % 10 === 0 || processedCount === listingsNeedingInfo.length) {
      progressCallback({
        status: 'processing',
        message: `Detailed info: ${processedCount}/${listingsNeedingInfo.length} processed (${skippedCount} skipped)`
      });
    }
  }
}

module.exports = { scrapeGoogleMaps, stopScraping, resetStopper };