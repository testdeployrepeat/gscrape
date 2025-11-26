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
 */
async function scrollResultsFeed(page, speed) {
  const scrollDelay = speed === 'ultra-fast' ? 300 : speed === 'fast' ? 800 : 1500;
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

  // Node.js controlled scrolling loop for responsive stopping
  let lastHeight = 0;
  let consecutiveNoChangeCount = 0;
  const maxConsecutiveNoChange = 2;
  let lastItemsCount = 0;

  while (!shouldStop) {
    // Check stop flag before action
    if (shouldStop) break;

    const result = await page.evaluate(async (selector) => {
      const element = document.querySelector(selector);
      if (!element) return { error: 'Element not found' };

      // Get current state
      const currentHeight = element.scrollHeight;
      const items = document.querySelectorAll('div[role="feed"] > div > div[jsaction] a[href*="/maps/place/"]').length;
      const endText = element.innerText || '';
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;

      // Scroll down
      element.scrollTop = element.scrollHeight;

      return {
        height: currentHeight,
        items,
        endText,
        isAtBottom
      };
    }, selectedSelector);

    if (result.error) break;

    // Check progress
    if (result.items === lastItemsCount) {
      consecutiveNoChangeCount++;
      if (consecutiveNoChangeCount >= maxConsecutiveNoChange) {
        console.log(`Scrolling stopped - no new items found after ${maxConsecutiveNoChange} checks.`);
        break;
      }
    } else {
      consecutiveNoChangeCount = 0;
      lastItemsCount = result.items;
      lastHeight = result.height;
    }

    // Check end conditions
    if (result.endText.includes("You've reached the end") ||
      (result.isAtBottom && result.items === lastItemsCount && consecutiveNoChangeCount > 0)) {
      console.log('Scrolling stopped - end reached.');
      break;
    }

    // Wait before next scroll (allows Node event loop to process stop signal)
    await wait(scrollDelay);
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
    extractWebsites = false,
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
      // If the main selectors aren't found, try navigating again with a slightly different method
      await page.goto(`https://www.google.com/maps`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Wait for search box to be available
      await page.waitForSelector('#searchboxinput', { timeout: 10000 });

      // Fill and submit search
      await page.type('#searchboxinput', searchQuery);
      await page.keyboard.press('Enter');
    }

    // Wait a bit more for results to populate
    await wait(2000);

    // NEW: Handle consent screen
    await handleConsent(page);

    // Additional wait after consent for results to fully load
    await wait(1500);

    if (shouldStop) throw new Error('Scraping cancelled by user');

    progressCallback({ status: 'scrolling', message: 'Loading all results...' });
    await scrollResultsFeed(page, speed);

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
          owner: '',
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
            // uniqueBusinesses.set(uniqueKey, true); // This line was commented out or removed, ensure it's not re-added if not intended.
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

    // Only visit individual pages if extractWebsites is explicitly enabled
    // This allows for more thorough extraction (owner info, etc.)
    if (extractWebsites && uniqueBusinesses.length > 0) {
      progressCallback({
        status: 'processing',
        message: `Extracting detailed website and owner info for ${uniqueBusinesses.length} businesses...`,
        total: uniqueBusinesses.length,
        data: finalResults // Send current data
      });

      for (let i = 0; i < uniqueBusinesses.length; i++) {
        if (shouldStop) break;
        const business = uniqueBusinesses[i];
        try {
          // Click the business card to open its detailed view
          await page.goto(business.link, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await wait(1500); // Reduced wait time for faster scraping

          const details = await page.evaluate(() => {
            // Website - try multiple selectors
            const websiteEl = document.querySelector('a[data-item-id="authority"]') ||
              document.querySelector('a[aria-label^="Website"]') ||
              document.querySelector('a[href*="http"]:not([href*="google"]):not([href*="maps"])');

            // Owner (Contributor link and name)
            const ownerEl = document.querySelector('a[href*="/maps/contrib/"]');

            return {
              website: websiteEl ? websiteEl.href : null,
              owner: ownerEl ? (ownerEl.textContent || ownerEl.innerText || ownerEl.getAttribute('aria-label') || ownerEl.href) : null
            };
          });

          // Only update if we found better data
          if (details.website && !business.website) business.website = details.website;
          if (details.owner) business.owner = details.owner;

        } catch (error) {
          console.error(`Could not get details for ${business.name}: ${error.message}`);
        }

        progressCallback({
          status: 'processing',
          message: `Extracting details ${i + 1}/${uniqueBusinesses.length}`,
          current: i + 1,
          total: uniqueBusinesses.length,
          data: finalResults // Send updated data
        });
      }
    }

    if (extractEmails && finalResults.length > 0) {
      progressCallback({
        status: 'processing',
        message: `Websites extracted. Now getting emails...`,
        total: finalResults.length,
        data: finalResults // Send current data
      });

      await extractEmailsInParallel(browser, finalResults, speed, progressCallback);
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
    // Properly close the browser with a timeout to avoid hanging
    if (browser) {
      try {
        // Give a bit of time for any pending operations to complete
        await wait(1000);
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
        // Force close if normal close fails
        try {
          await browser.close();
        } catch (forceCloseError) {
          console.error('Force close also failed:', forceCloseError);
        }
      }
    }
  }
}

async function extractEmailsInParallel(browser, results, speed, progressCallback) {
  const websitesToScan = results.filter(r => r.website);
  if (websitesToScan.length === 0) return;

  progressCallback({ status: 'processing', message: `Searching ${websitesToScan.length} websites for emails...` });

  const batchSize = speed === 'ultra-fast' ? 15 : speed === 'fast' ? 8 : 5;
  const timeout = speed === 'ultra-fast' ? 10000 : speed === 'fast' ? 12000 : 15000;

  let processedCount = 0;
  for (let i = 0; i < websitesToScan.length; i += batchSize) {
    if (shouldStop) break;
    const batch = websitesToScan.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (business) => {
        business.email = await extractEmailFromWebsite(browser, business.website, timeout) || '';
      })
    );
    processedCount += batch.length;
    progressCallback({
      status: 'processing',
      message: `Scanned ${processedCount}/${websitesToScan.length} websites for emails`
    });
  }
}

async function extractEmailFromWebsite(browser, websiteUrl, timeout) {
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

    await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout });
    const email = await page.evaluate(() => {
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      const html = document.body.innerHTML;
      const matches = html.match(emailRegex) || [];
      const filtered = matches.filter(e => !['.png', '.jpg', '.gif', 'sentry.io'].some(d => e.toLowerCase().includes(d)));
      const priority = filtered.find(e => /^(info|contact|support|hello|admin)@/i.test(e));
      return priority || filtered[0] || '';
    });
    return email;
  } catch (error) {
    return '';
  } finally {
    if (page) await page.close();
  }
}

module.exports = { scrapeGoogleMaps, stopScraping };