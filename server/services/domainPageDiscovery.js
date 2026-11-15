
const cheerio = require("cheerio");
const { fetchWebsiteHTML } = require("./websiteFetchService");

const MAX_DOMAIN_PAGES = 6; // Includes the original scanned page.

const PAGE_KEYWORDS = [
    "contact",
    "support",
    "customer-care",
    "customer care",
    "about",
    "privacy",
    "return",
    "refund",
    "cancellation",
    "legal",
    "company"
];

const PAGE_KEYWORD_PRIORITY = {
    contact: 10,
    "customer care": 9,
    "customer-care": 9,
    support: 8,
    privacy: 8,
    return: 8,
    refund: 8,
    cancellation: 7,
    legal: 6,
    about: 5,
    company: 4
};

const EXCLUDED_PAGE_PATTERN =
    /(^|[^a-z0-9])(log[\s_-]?in|sign[\s_-]?in|sign[\s_-]?up|signup|register|cart|basket|check[\s_-]?out)(?=$|[^a-z0-9])/i;

function getPagePriority(keywords) {
    return Math.max(
        ...keywords.map(keyword => PAGE_KEYWORD_PRIORITY[keyword] || 0)
    );
}

function normalizePageUrl(input, baseUrl, allowedHostname) {
    try {
        const url = new URL(input, baseUrl);

        if (!["http:", "https:"].includes(url.protocol)) {
            return null;
        }

        if (url.username || url.password) {
            return null;
        }

        // Only crawl the exact hostname being scanned.
        if (url.hostname.toLowerCase() !== allowedHostname.toLowerCase()) {
            return null;
        }

        url.hash = "";

        // Remove common tracking parameters.
        for (const key of [...url.searchParams.keys()]) {
            if (
                key.startsWith("utm_") ||
                ["gclid", "fbclid", "gad_source"].includes(key)
            ) {
                url.searchParams.delete(key);
            }
        }

        return url.toString();
    } catch {
        return null;
    }
}

function extractRelevantLinks(html, baseUrl, allowedHostname) {
    const $ = cheerio.load(html);
    const candidates = new Map();

    $("a[href]").each((_, element) => {
        const href = $(element).attr("href");
        const text = $(element).text().toLowerCase();
        const aria = (
            $(element).attr("aria-label") || ""
        ).toLowerCase();

        const combined = `${text} ${aria} ${href}`.toLowerCase();

        const matchedKeywords = PAGE_KEYWORDS.filter(keyword =>
            combined.includes(keyword)
        );

        if (matchedKeywords.length === 0) {
            return;
        }

        const normalizedUrl = normalizePageUrl(
            href,
            baseUrl,
            allowedHostname
        );

        if (!normalizedUrl) {
            return;
        }

        const parsed = new URL(normalizedUrl);
        const excludedPageDetails =
            `${parsed.pathname} ${text} ${aria}`;

        if (EXCLUDED_PAGE_PATTERN.test(excludedPageDetails)) {
            return;
        }

        // Avoid crawling the same path repeatedly with different queries.
        const key = `${parsed.origin}${parsed.pathname}`;

        if (candidates.has(key)) {
            const existing = candidates.get(key);
            existing.keywords = [
                ...new Set([...existing.keywords, ...matchedKeywords])
            ];
        } else {
            candidates.set(key, {
                url: normalizedUrl,
                keywords: matchedKeywords
            });
        }
    });

    return [...candidates.values()].sort(
        (a, b) => getPagePriority(b.keywords) - getPagePriority(a.keywords)
    );
}

async function fetchPage(url, allowedHostname) {
    try {
        return await fetchWebsiteHTML(url, { allowedHostname });
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error
                ? error.message
                : "Page fetch failed."
        };
    }
}

function validateFetchedPage(result, expectedHostname) {
    if (!result || result.success !== true) {
        return {
            error: result && typeof result.message === "string"
                ? result.message
                : "Page fetch failed."
        };
    }

    if (typeof result.finalUrl !== "string") {
        return { error: "Page fetch returned an invalid final URL." };
    }

    let finalUrl;

    try {
        finalUrl = new URL(result.finalUrl);
    } catch {
        return { error: "Page fetch returned an invalid final URL." };
    }

    if (!["http:", "https:"].includes(finalUrl.protocol)) {
        return { error: "Page fetch returned an invalid final URL." };
    }

    if (finalUrl.hostname.toLowerCase() !== expectedHostname.toLowerCase()) {
        return { error: "Page redirected to another hostname." };
    }

    if (typeof result.html !== "string") {
        return { error: "Page fetch returned invalid HTML content." };
    }

    return {
        page: {
            url: finalUrl.toString(),
            html: result.html
        }
    };
}

async function discoverDomainPages(startUrl, initialHtml) {
    const pages = [
        {
            url: startUrl,
            html: initialHtml,
            source: "scanned-page"
        }
    ];

    const failedPages = [];
    const visited = new Set();

    try {
        const start = new URL(startUrl);
        const hostname = start.hostname;

        visited.add(`${start.origin}${start.pathname}`);

        // Fetch homepage if the scanned URL is not already the homepage.
        const homepageUrl = `${start.origin}/`;
        const homepageKey = `${start.origin}/`;

        if (
            `${start.origin}${start.pathname}` !== homepageKey &&
            pages.length < MAX_DOMAIN_PAGES
        ) {
            visited.add(homepageKey);

            const homepageResult = await fetchPage(homepageUrl, hostname);
            const validatedHomepage = validateFetchedPage(
                homepageResult,
                hostname
            );

            if (validatedHomepage.page) {
                pages.push({
                    ...validatedHomepage.page,
                    source: "homepage"
                });
            } else {
                failedPages.push({
                    url: homepageUrl,
                    reason: validatedHomepage.error
                });
            }
        }

        // Discover relevant links from the scanned page and fetched homepage.
        const candidates = new Map();

        for (const page of pages) {
            const links = extractRelevantLinks(
                page.html,
                page.url,
                hostname
            );

            for (const link of links) {
                const parsed = new URL(link.url);
                const key = `${parsed.origin}${parsed.pathname}`;

                if (!visited.has(key) && !candidates.has(key)) {
                    candidates.set(key, link);
                }
            }
        }

        // Fetch a limited number of relevant pages sequentially.
        for (const [key, candidate] of candidates) {
            if (pages.length >= MAX_DOMAIN_PAGES) {
                break;
            }

            if (visited.has(key)) {
                continue;
            }

            visited.add(key);

            const result = await fetchPage(candidate.url, hostname);
            const validatedPage = validateFetchedPage(result, hostname);

            if (!validatedPage.page) {
                failedPages.push({
                    url: candidate.url,
                    keywords: candidate.keywords,
                    reason: validatedPage.error
                });
                continue;
            }

            pages.push({
                ...validatedPage.page,
                source: "internal-page"
            });
        }

        return {
            success: true,
            pages,
            failedPages,
            pagesAnalyzed: pages.length,
            maximumPages: MAX_DOMAIN_PAGES
        };

    } catch (error) {
        return {
            success: false,
            pages,
            failedPages,
            pagesAnalyzed: pages.length,
            message: error.message
        };
    }
}

module.exports = {
    discoverDomainPages,
    extractRelevantLinks,
    normalizePageUrl
};
