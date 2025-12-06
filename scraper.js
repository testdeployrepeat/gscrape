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

/**
 * NEW: Clicks the consent button that can appear on first load.
 */
async function handleConsent(page) {
  try {
    const consentButtonSelector = 'button[aria-label="Accept all"], button[aria-label="I agree"]';
    await page.waitForSelector(consentButtonSelector, { timeout: 5000, visible: true });
    await page.click(consentButtonSelector);
    console.log('Consent button clicked.');
    await wait(2000); // Wait for page to adjust after consent
  } catch (error) {
    console.log('Consent screen not found or already handled.');
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

  // Event-driven scrolling with exponential backoff
  let lastItemsCount = 0;
  let noChangeCount = 0;
  let currentDelay = 300; // Start with fast 300ms delay
  const maxDelay = 2000; // Cap at 2 seconds
  const delayMultiplier = 1.5; // Exponential backoff factor
  const maxNoChangeAttempts = 3; // Require 3 consecutive no-change cycles before stopping

  while (!shouldStop) {
    // Get current state and scroll
    const result = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return { error: 'Element not found' };

      const items = document.querySelectorAll('div[role="feed"] > div > div[jsaction] a[href*="/maps/place/"]').length;
      const endText = element.innerText || '';
      const previousScrollTop = element.scrollTop;

      // Scroll to bottom
      element.scrollTop = element.scrollHeight;

      return {
        items,
        endText,
        scrollChanged: element.scrollTop !== previousScrollTop,
        isAtBottom: element.scrollHeight - element.scrollTop <= element.clientHeight + 100
      };
    }, selectedSelector);

    if (result.error) break;

    // Check for "end of list" text immediately (most reliable signal)
    if (result.endText.includes("You've reached the end")) {
      console.log('Scrolling stopped - end of list detected.');
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

      // Only stop after multiple failed attempts at maximum delay
      if (noChangeCount >= maxNoChangeAttempts && currentDelay >= maxDelay) {
        console.log(`Scrolling stopped - no new items after ${maxNoChangeAttempts} attempts. Total: ${lastItemsCount} items.`);
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
    } catch (e) {
      // Timeout - no new content appeared, will check on next iteration
    }

    // Small buffer to allow DOM updates
    await wait(150);
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

  shouldStop = false;

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

    // Use a more reliable navigation method
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'domcontentloaded', // Change to domcontentloaded for faster initial load
      timeout: 60000
    });

    // Wait for the results to start loading
    try {
      await page.waitForSelector('div[role="feed"], div[aria-label^="Results for"], #searchbox', {
        timeout: 10000
      });
    } catch (e) {
      // Check if there might be a consent banner by looking for consent-related elements
      const hasConsentBanner = await page.evaluate(() => {
        // Check for common consent banner elements (case-insensitive without using unsupported flags)
        const buttons = Array.from(document.querySelectorAll('button'));
        const hasConsentButton = buttons.some(button => {
          const label = button.getAttribute('aria-label') || '';
          return label.toLowerCase().includes('accept') ||
            label.toLowerCase().includes('agree') ||
            label.toLowerCase().includes('consent');
        });

        // Check for modal dialog which is often used for consent
        const hasModal = document.querySelector('div[aria-modal="true"]') !== null ||
          document.querySelector('div[role="dialog"]') !== null;

        return hasConsentButton || hasModal;
      });

      // Only handle consent if we detect consent-related elements
      if (hasConsentBanner) {
        await handleConsent(page);

        // After handling consent, try again to find the selectors
        try {
          await page.waitForSelector('div[role="feed"], div[aria-label^="Results for"], #searchbox', {
            timeout: 10000
          });
        } catch (e2) {
          // If selectors still can't be found after consent handling, throw a helpful error
          throw new Error('Unable to find search results. If you\'re scraping from EU, please use a VPN or non-EU proxy.');
        }
      } else {
        // If no consent banner detected, throw the error directly
        throw new Error('Unable to find search results. If you\'re scraping from EU, please use a VPN or non-EU proxy.');
      }
    }

    // Wait a bit more for results to populate
    await wait(2000);

    // Additional wait after consent for results to fully load
    await wait(1500);

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
                // Phone number detection
                if (part.match(/(\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/)) {
                  data.phone = part;
                }
                // Address detection - exclude ratings, stars, reviews
                else if (part.match(/\d/) && !part.includes('star')) {
                  // Skip ratings like "4.9(162)" or "4.9 (162)"
                  if (part.match(/^\d\.\d+\s*\(\d+\)/)) return;

                  // Skip opening hours/status that contain digits
                  if (part.match(/^(Opens|Closes|Temporarily|Permanently)\b/i)) return;
                  if (part.match(/^Open\b/i) && part.match(/(AM|PM|hours?|soon|now)/i)) return;

                  // Skip if it looks like a rating number
                  if (part.match(/^\d\.\d+$/)) return;

                  const cleanedAddress = part.replace(/Open \d+ Hours?|Open now|Closes soon|Closed/gi, '').trim();
                  if (cleanedAddress.length > 5 && !cleanedAddress.match(/^\d+$/)) {
                    data.address = cleanedAddress;
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

    if (extractEmails && finalResults.length > 0) {
      progressCallback({
        status: 'processing',
        message: `Extracting emails from ${finalResults.filter(r => r.website).length} websites...`
      });

      await extractEmailsInParallel(browser, finalResults, speed, progressCallback, options.emailScrapingLimit, options.deepEmailExtraction);
    }

    // Option to visit individual business pages for more complete information
    if (options.extractDetailedInfo) {
      progressCallback({
        status: 'processing',
        message: `Visiting ${uniqueBusinesses.length} business pages for detailed info...`,
        total: uniqueBusinesses.length,
        data: uniqueBusinesses // Send current data
      });

      await extractDetailedInfo(browser, finalResults, speed, progressCallback);
    }

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
        // Close all pages first for cleaner shutdown
        const pages = await browser.pages();
        await Promise.all(pages.map(p => p.close().catch(() => { })));

        // Disconnect and close browser with 3-second timeout
        await Promise.race([
          (async () => {
            await browser.close();
          })(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Browser close timeout')), 3000)
          )
        ]);
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
        // Force kill the browser process immediately
        try {
          browser.process()?.kill('SIGKILL');
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

    // Try homepage first
    await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout });

    let email = await page.evaluate(() => {
      // 1. Check mailto: links first (most reliable)
      const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
      if (mailtoLinks.length > 0) {
        const emailFromLink = mailtoLinks[0].href.replace('mailto:', '').split('?')[0].trim();
        return emailFromLink;
      }

      // 2. Enhanced regex pattern for better matching
      const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
      const html = document.body.innerHTML;
      const matches = html.match(emailRegex) || [];

      // 3. Filter out false positives
      const filtered = matches.filter(e => {
        const lower = e.toLowerCase();
        return !lower.includes('.png') &&
          !lower.includes('.jpg') &&
          !lower.includes('.gif') &&
          !lower.includes('example.com') &&
          !lower.includes('sentry.io');
      });

      // 4. Prioritize common business email prefixes
      const priority = filtered.find(e => /^(info|contact|support|hello|admin|sales|team)@/i.test(e));
      return priority || filtered[0] || '';
    });

    // Deep extraction: check contact page if enabled and no email found
    if (deepExtraction && !email) {
      try {
        const contactUrl = new URL('/contact', websiteUrl).href;
        await page.goto(contactUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });

        email = await page.evaluate(() => {
          // Check mailto: links on contact page
          const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
          if (mailtoLinks.length > 0) {
            return mailtoLinks[0].href.replace('mailto:', '').split('?')[0].trim();
          }

          // Fallback to regex
          const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
          const matches = document.body.textContent.match(emailRegex) || [];
          const filtered = matches.filter(e => !e.toLowerCase().includes('.png'));
          return filtered[0] || '';
        });
      } catch (e) {
        // Contact page doesn't exist or failed to load - that's okay
      }
    }

    return email;
  } catch (error) {
    return '';
  } finally {
    if (page) await page.close();
  }
}

async function extractDetailedInfo(browser, results, speed, progressCallback) {
  if (results.length === 0) return;

  progressCallback({ status: 'processing', message: `Extracting detailed information from ${results.length} business pages...` });

  const batchSize = speed === 'fast' ? 3 : 2; // Smaller batch size for detailed extraction
  const timeout = speed === 'fast' ? 15000 : 20000;

  let processedCount = 0;
  for (let i = 0; i < results.length; i += batchSize) {
    if (shouldStop) break;

    const batch = results.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (business) => {
        // Extract detailed info for each business
        const detailedInfo = await getDetailedBusinessInfo(browser, business.link, timeout);

        // Only update fields that are missing or empty
        if (detailedInfo.phone && !business.phone) {
          business.phone = detailedInfo.phone;
        }
        if (detailedInfo.website && !business.website) {
          business.website = detailedInfo.website;
        }
        if (detailedInfo.address && !business.address) {
          business.address = detailedInfo.address;
        }
        if (detailedInfo.owner && !business.owner) {
          business.owner = detailedInfo.owner;
        }
      })
    );

    processedCount += batch.length;
    progressCallback({
      status: 'processing',
      message: `Detailed info extracted from ${processedCount}/${results.length} business pages`
    });
  }
}

async function getDetailedBusinessInfo(browser, businessUrl, timeout) {
  let page;
  try {
    page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media', 'websocket'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(businessUrl, { waitUntil: 'networkidle0', timeout });  // Wait for network to be idle

    // Wait a bit for the page to fully load and for any dynamic content to render
    await wait(3000);

    // Some phone numbers might be loaded dynamically when certain elements are clicked/hovered
    // Try to trigger possible event handlers that might reveal phone numbers
    try {
      // Look for elements that might reveal phone numbers when clicked
      await page.evaluate(() => {
        // Trigger mouseover events on common elements that might reveal phone numbers
        const elements = document.querySelectorAll('button, span, div');
        for (let i = 0; i < elements.length && i < 50; i++) {  // Limit to first 50 elements to avoid performance issues
          elements[i].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }
      });

      // Wait a bit more after triggering events
      await wait(1000);
    } catch (e) {
      console.log('Could not trigger events on page:', e.message);
    }

    const detailedInfo = await page.evaluate(() => {
      const info = {
        phone: '',
        website: '',
        address: '',
        owner: ''
      };

      // Extract phone number using multiple strategies
      // Strategy 1: Look for elements with data-item-id="phone"
      const phoneElement = document.querySelector('button[data-item-id="phone"], div[data-item-id="phone"], a[href^="tel:"]');
      if (phoneElement) {
        // Get the text content
        let text = phoneElement.textContent || phoneElement.innerText || '';
        if (text && (text.match(/(\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/) || text.match(/\+?[\d\s\-\(\)]{10,}/))) {
          info.phone = text.trim();
        }
      }

      // Strategy 2: Look for tel: links in the page
      if (!info.phone) {
        const telLink = document.querySelector('a[href^="tel:"]');
        if (telLink) {
          let href = telLink.getAttribute('href');
          if (href) {
            info.phone = href.replace('tel:', '').replace(/[^\d\s\-\+\(\)]/g, ' ').trim();
          }
        }
      }

      // Strategy 3: Look for data-item-id attributes with phone numbers in format "phone:tel:+1234567890"
      if (!info.phone) {
        const phoneElements = document.querySelectorAll('[data-item-id*="phone:tel:"]');
        for (const element of phoneElements) {
          const dataItemId = element.getAttribute('data-item-id');
          if (dataItemId) {
            // Extract phone number from format like "phone:tel:+14695770339"
            const phoneMatch = dataItemId.match(/phone:tel:(.*)/i);
            if (phoneMatch && phoneMatch[1]) {
              info.phone = phoneMatch[1].trim();
              break;
            }
          }
        }
      }

      // Strategy 4: Look for elements with tooltip/title attributes indicating "copy phone number"
      if (!info.phone) {
        const elementsWithTooltip = document.querySelectorAll('button[aria-label*="phone" i], [data-tooltip*="phone" i], [title*="phone" i]');
        for (const element of elementsWithTooltip) {
          // Check aria-label attribute for phone numbers
          const ariaLabel = element.getAttribute('aria-label');
          if (ariaLabel && (ariaLabel.match(/(\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/) || ariaLabel.match(/\+?[\d\s\-\(\)]{10,}/))) {
            info.phone = ariaLabel.trim();
            break;
          }

          // Check title attribute for phone numbers
          const title = element.getAttribute('title');
          if (title && (title.match(/(\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/) || title.match(/\+?[\d\s\-\(\)]{10,}/))) {
            info.phone = title.trim();
            break;
          }

          // Check data-tooltip attribute for phone numbers
          const dataTooltip = element.getAttribute('data-tooltip');
          if (dataTooltip && (dataTooltip.match(/(\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/) || dataTooltip.match(/\+?[\d\s\-\(\)]{10,}/))) {
            info.phone = dataTooltip.trim();
            break;
          }
        }
      }

      // Strategy 4: Look for elements with common phone-related classes/attributes in the page
      if (!info.phone) {
        const allElements = document.querySelectorAll('*');
        for (const element of allElements) {
          let text = element.textContent || element.innerText || '';
          // Look for potential phone number patterns
          if (text && text.length > 6 && (text.match(/(\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/) ||
            text.match(/\+?[\d\s\-\(\)]{10,}/))) {
            // Additional validation to make sure it's likely a phone number
            if (text.length <= 25) {  // Phone numbers are usually not longer than this
              info.phone = text.trim();
              break;
            }
          }
        }
      }

      // Extract website using multiple strategies
      // Strategy 1: Look for data-item-id="authority"
      const websiteElement = document.querySelector('a[data-item-id="authority"]');
      if (websiteElement && websiteElement.href && !websiteElement.href.includes('google.com') && !websiteElement.href.includes('maps')) {
        info.website = websiteElement.href;
      }

      // Strategy 2: Look for aria-label containing "Website" in format like "Website: joespizzanyc.com"
      if (!info.website) {
        const websiteAriaLabels = document.querySelectorAll('a[aria-label*="Website" i]');
        for (const element of websiteAriaLabels) {
          if (element.href && !element.href.includes('google.com') && !element.href.includes('maps')) {
            info.website = element.href;
            break;
          }
        }
      }

      // Strategy 3: Look for aria-label with format "Website: joespizzanyc.com" and get the actual URL from the href
      if (!info.website) {
        const elementsWithWebsiteAria = document.querySelectorAll('[aria-label*="Website" i]');
        for (const element of elementsWithWebsiteAria) {
          const ariaLabel = element.getAttribute('aria-label');
          if (ariaLabel && ariaLabel.toLowerCase().includes('website:')) {
            // Extract domain from aria-label like "Website: joespizzanyc.com"
            const websiteMatch = ariaLabel.match(/website:\s*(.+)/i);
            if (websiteMatch && websiteMatch[1]) {
              // If the element is an anchor tag, use its href
              if (element.tagName.toLowerCase() === 'a' && element.href &&
                !element.href.includes('google.com') && !element.href.includes('maps')) {
                info.website = element.href;
                break;
              } else {
                // If not an anchor tag, construct a URL assuming http
                let domain = websiteMatch[1].trim();
                if (!domain.startsWith('http')) {
                  domain = 'https://' + domain;
                }
                info.website = domain;
                break;
              }
            }
          }
        }
      }

      // Strategy 4: Look for external links that are not Google Maps
      if (!info.website) {
        const allLinks = document.querySelectorAll('a[href*="http"]');
        for (const link of allLinks) {
          const href = link.href;
          if (href &&
            !href.includes('google.com') &&
            !href.includes('maps') &&
            !href.includes('googleusercontent.com') &&
            !href.includes('googleapis.com') &&
            !href.includes('gstatic.com')) {
            // Additional validation - check if this might be a website link
            // by looking for common business website patterns
            if (href.match(/\/(www\.)?[^.]+\.[^.]+/)) {
              info.website = href;
              break;
            }
          }
        }
      }

      // Extract address using multiple strategies
      // Strategy 1: Look for data-item-id="address"
      const addressElement = document.querySelector('button[data-item-id="address"], div[data-item-id="address"]');
      if (addressElement) {
        info.address = (addressElement.textContent || addressElement.innerText || '').replace(/\s+/g, ' ').trim();
      }

      // Strategy 2: Look for address in common patterns
      if (!info.address) {
        const allElements = document.querySelectorAll('*');
        for (const element of allElements) {
          let text = element.textContent || element.innerText || '';
          // Look for elements that might contain address information
          // Usually addresses have numbers (street number) and common abbreviations
          if (text && text.length > 5 && text.length < 200) {
            // Check if text contains common address indicators
            if (text.match(/\d+/) &&  // Has numbers (street number)
              (text.toLowerCase().includes('st') ||
                text.toLowerCase().includes('ave') ||
                text.toLowerCase().includes('rd') ||
                text.toLowerCase().includes('blvd') ||
                text.toLowerCase().includes('lane') ||
                text.toLowerCase().includes('drive') ||
                text.toLowerCase().includes('street') ||
                text.toLowerCase().includes('road') ||
                text.includes(','))) {  // Usually addresses have commas between city, state
              info.address = text.replace(/\s+/g, ' ').trim();
              break;
            }
          }
        }
      }

      // Extract owner (if available)
      const ownerLink = document.querySelector('a[data-item-id="owner"]');
      if (ownerLink) {
        info.owner = ownerLink.href;
      }

      return info;
    });

    return detailedInfo;
  } catch (error) {
    console.error(`Error extracting detailed info from ${businessUrl}:`, error);
    return { phone: '', website: '', address: '', owner: '' };
  } finally {
    if (page) await page.close();
  }
}

module.exports = { scrapeGoogleMaps, stopScraping };