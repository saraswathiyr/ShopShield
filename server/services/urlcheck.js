
const normalizeDomain = require("../utils/normalizeDomain");

// Suspicious TLDs are indicators, not proof of fraud.
const SUSPICIOUS_TLDS = new Set([
    "xyz",
    "top",
    "click"
]);

const KNOWN_BRANDS = [
    "amazon",
    "flipkart",
    "myntra",
    "meesho",
    "ajio",
    "nykaa",
    "snapdeal",
    "ebay",
    "walmart",
    "apple",
    "samsung",
    "nike",
    "adidas",
    "puma",
    "zara",
    "h&m",
    "croma",
    "reliance",
    "tatacliq",
    "jiomart"
];

// Normalize common number substitutions.
function normalizeBrandText(value) {
    return value
        .toLowerCase()
        .replace(/0/g, "o")
        .replace(/1/g, "l")
        .replace(/3/g, "e")
        .replace(/4/g, "a")
        .replace(/5/g, "s")
        .replace(/7/g, "t");
}

// Calculate Levenshtein distance.
function levenshteinDistance(a, b) {
    const matrix = Array.from(
        { length: a.length + 1 },
        () => Array(b.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i++) {
        matrix[i][0] = i;
    }

    for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;

            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[a.length][b.length];
}

// Calculate similarity.
function calculateSimilarity(a, b) {
    const maxLength = Math.max(a.length, b.length);

    if (maxLength === 0) return 1;

    return 1 - levenshteinDistance(a, b) / maxLength;
}

// Detect possible brand impersonation.
function detectBrandTyposquatting(domainLabel) {
    const tokens = domainLabel
        .toLowerCase()
        .split("-")
        .filter(Boolean);

    const matches = [];

    for (const brand of KNOWN_BRANDS) {
        for (const token of tokens) {
            const normalizedToken = normalizeBrandText(token);

            if (normalizedToken === brand) {
                if (domainLabel.toLowerCase() !== brand) {
                    matches.push({
                        brand,
                        similarity: 1,
                        type: "brand-name-with-extra-words"
                    });
                }

                continue;
            }

            if (Math.abs(normalizedToken.length - brand.length) > 2) {
                continue;
            }

            const similarity = calculateSimilarity(
                normalizedToken,
                brand
            );

            if (similarity >= 0.80) {
                matches.push({
                    brand,
                    similarity: Number(similarity.toFixed(2)),
                    type: "possible-typosquatting"
                });
            }
        }
    }

    return matches.filter(
        (match, index, array) =>
            index === array.findIndex(
                item => item.brand === match.brand
            )
    );
}

// Main URL security check.
async function urlCheck(inputUrl) {
    const normalized = normalizeDomain(inputUrl);

    const {
        hostname,
        domain,
        subdomain,
        publicSuffix,
        isIP
    } = normalized;

    let points = 0;
    const reasons = [];

    const protocol = new URL(inputUrl).protocol;

    const evidence = {
        hostname,
        domain,
        protocol,
        isIP,
        tld: publicSuffix.split(".").pop() || null,
        hyphenCount: (hostname.match(/-/g) || []).length,
        subdomainCount: subdomain
            ? subdomain.split(".").length
            : 0,
        brandMatches: []
    };

    // 1. HTTPS check.
    if (protocol !== "https:") {
        points += 15;
        reasons.push("Website does not use HTTPS");
    }

    // 2. IP address check.
    if (isIP) {
        points += 25;
        reasons.push(
            "Website uses an IP address instead of a domain name"
        );
    }

    // 3. Suspicious TLD check.
    if (SUSPICIOUS_TLDS.has(evidence.tld)) {
        points += 8;
        reasons.push(
            `Website uses a potentially suspicious .${evidence.tld} domain`
        );
    }

    // 4. Excessive hyphens.
    if (evidence.hyphenCount > 3) {
        points += 5;
        reasons.push(
            "Website contains an unusually high number of hyphens"
        );
    }

    // 5. Excessive subdomains.
    if (evidence.subdomainCount > 3) {
        points += 5;
        reasons.push(
            "Website contains an unusually high number of subdomains"
        );
    }

    // 6. Possible brand impersonation.
    if (!isIP) {
        const domainLabel = domain.split(".")[0];

        evidence.brandMatches =
            detectBrandTyposquatting(domainLabel);

        if (evidence.brandMatches.length > 0) {
            points += 25;
            reasons.push(
                "Domain may be impersonating a known brand"
            );
        }
    }

    return {
        points: Math.min(points, 100),
        reasons,
        failed: false,
        evidence
    };
}

module.exports = urlCheck;

