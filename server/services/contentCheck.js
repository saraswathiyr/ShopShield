
const cheerio = require("cheerio");

const URGENCY_PHRASES = [
    "limited time offer",
    "act now",
    "only today",
    "buy immediately",
    "offer expires soon",
    "last chance",
    "hurry up"
];

const SUSPICIOUS_PAYMENT_PHRASES = [
    "pay only through bank transfer",
    "payment only by bank transfer",
    "send money to personal account",
    "pay to personal upi",
    "transfer money to personal account",
    "payment through gift cards only",
    "pay using cryptocurrency only"
];

const BUSINESS_TYPES = [
    "Organization",
    "LocalBusiness",
    "Store",
    "Corporation",
    "OnlineStore",
    "ClothingStore",
    "ElectronicsStore"
];

function hasPolicyLink($, keywords) {
    let found = false;

    $("a").each((_, element) => {
        const text = $(element).text().toLowerCase();
        const href = ($(element).attr("href") || "").toLowerCase();
        const ariaLabel = (
            $(element).attr("aria-label") || ""
        ).toLowerCase();

        if (
            keywords.some(keyword =>
                text.includes(keyword) ||
                href.includes(keyword) ||
                ariaLabel.includes(keyword)
            )
        ) {
            found = true;
            return false;
        }
    });

    return found;
}

function detectContactInformation(text) {
    const emailPattern =
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

    const phonePattern =
        /(?:\+?\d[\d\s().-]{7,}\d)/;

    return {
        emailFound: emailPattern.test(text),
        phoneFound: phonePattern.test(text)
    };
}

function hasBusinessType(item) {
    const types = Array.isArray(item["@type"])
        ? item["@type"]
        : [item["@type"]];

    return types.some(type => {
        if (typeof type !== "string") return false;

        const normalizedType = type
            .split("/")
            .pop()
            .split("#")
            .pop();

        return BUSINESS_TYPES.includes(normalizedType);
    });
}

function containsOrganization(item) {
    if (!item || typeof item !== "object") {
        return false;
    }

    if (Array.isArray(item)) {
        return item.some(containsOrganization);
    }

    if (hasBusinessType(item)) {
        return true;
    }

    return Object.values(item).some(value =>
        value && typeof value === "object"
            ? containsOrganization(value)
            : false
    );
}

function detectBusinessInformation($, text) {
    const organizationSchema = $(
        'script[type="application/ld+json"]'
    ).toArray().some(element => {
        try {
            const data = JSON.parse($(element).contents().text());
            return containsOrganization(data);
        } catch {
            return false;
        }
    });

    const metadataSelectors = [
        'meta[property="og:site_name"]',
        'meta[name="application-name"]',
        'meta[property="og:business:contact_data:street_address"]',
        'meta[property="og:business:contact_data:locality"]',
        'meta[property="og:business:contact_data:country_name"]'
    ];

    const metadataFound = metadataSelectors.some(selector => {
        const value = $(selector).attr("content");
        return typeof value === "string" && value.trim().length > 0;
    });

    const businessLinkFound = hasPolicyLink($, [
        "about us",
        "about our company",
        "company information",
        "corporate information",
        "legal information",
        "imprint",
        "business details",
        "global selling"
    ]);

    const businessKeywords = [
        "about us",
        "our company",
        "company information",
        "business address",
        "registered office",
        "corporate office",
        "company registration"
    ];

    const businessTextFound = businessKeywords.some(keyword =>
        text.includes(keyword)
    );

    return (
        organizationSchema ||
        metadataFound ||
        businessLinkFound ||
        businessTextFound
    );
}

function detectSuspiciousPayments(text) {
    return SUSPICIOUS_PAYMENT_PHRASES.filter(phrase =>
        text.includes(phrase)
    );
}

function detectUrgency(text) {
    return URGENCY_PHRASES.filter(phrase =>
        text.includes(phrase)
    );
}

// Accept one HTML page or multiple HTML pages.
function contentCheck(input) {
    try {
        const pages = Array.isArray(input) ? input : [input];

        if (
            pages.length === 0 ||
            pages.some(html =>
                typeof html !== "string" || !html.trim()
            )
        ) {
            throw new Error("Valid HTML content is required");
        }

        let combinedText = "";
        let businessInformationFound = false;
        let contactPageFound = false;
        let privacyPolicyFound = false;
        let refundPolicyFound = false;

        const suspiciousPayments = new Set();
        const urgencyPhrases = new Set();

        for (const html of pages) {
            const $ = cheerio.load(html);

            const initialText = $("body")
                .text()
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();

            if (detectBusinessInformation($, initialText)) {
                businessInformationFound = true;
            }

            if (hasPolicyLink($, ["contact us", "contact", "support"])) {
                contactPageFound = true;
            }

            if (hasPolicyLink($, [
                "privacy policy",
                "privacy",
                "privacy-policy"
            ])) {
                privacyPolicyFound = true;
            }

            if (hasPolicyLink($, [
                "refund policy",
                "return policy",
                "refund",
                "returns",
                "return-policy"
            ])) {
                refundPolicyFound = true;
            }

            $("script, style, noscript, svg").remove();

            const visibleText = $("body")
                .text()
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();

            combinedText += " " + visibleText;

            detectSuspiciousPayments(visibleText).forEach(phrase =>
                suspiciousPayments.add(phrase)
            );

            detectUrgency(visibleText).forEach(phrase =>
                urgencyPhrases.add(phrase)
            );
        }

        const contact = detectContactInformation(combinedText);

        const paymentResults = [...suspiciousPayments];
        const urgencyResults = [...urgencyPhrases];

        let points = 0;
        const reasons = [];

        if (!contact.emailFound && !contact.phoneFound) {
            points += 8;
            reasons.push(
                "No email address or phone number was detected across the checked domain pages"
            );
        }

        if (!businessInformationFound) {
            points += 5;
            reasons.push(
                "Business identity information was not detected"
            );
        }

        if (!privacyPolicyFound) {
            points += 4;
            reasons.push("Privacy policy link was not detected");
        }

        if (!refundPolicyFound) {
            points += 4;
            reasons.push(
                "Refund or return policy link was not detected"
            );
        }

        if (paymentResults.length > 0) {
            points += 15;
            reasons.push(
                "Website contains potentially risky payment instructions"
            );
        }

        if (urgencyResults.length >= 3) {
            points += 8;
            reasons.push(
                "Website uses multiple urgency-related promotional phrases"
            );
        }

        return {
            points,
            reasons,
            failed: false,
            evidence: {
                status: "analysis-completed",
                pagesAnalyzed: pages.length,
                contactInformation: contact,
                businessInformationFound,
                contactPageFound,
                privacyPolicyFound,
                refundPolicyFound,
                suspiciousPaymentPhrases: paymentResults,
                urgencyPhrasesFound: urgencyResults
            }
        };

    } catch (error) {
        return {
            points: 0,
            reasons: [],
            failed: true,
            evidence: {
                status: "error",
                message: error.message
            }
        };
    }
}

module.exports = contentCheck;

