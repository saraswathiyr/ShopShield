
const cheerio = require("cheerio");

// Risk thresholds for advertised discounts.
const DISCOUNT_RULES = [
    { minimum: 70, points: 25 },
    { minimum: 50, points: 15 },
    { minimum: 30, points: 8 }
];

// Convert price strings into numbers.
function parsePrice(value) {
    if (value === undefined || value === null) {
        return null;
    }

    const numeric = String(value)
        .replace(/[^\d.,]/g, "");

    if (!numeric) return null;

    const separators = [...numeric.matchAll(/[.,]/g)];
    let cleaned = numeric;

    if (separators.length > 0) {
        const lastSeparator = separators[separators.length - 1];
        const digitsAfterLastSeparator =
            numeric.length - lastSeparator.index - 1;
        const hasBothSeparators =
            numeric.includes(".") && numeric.includes(",");
        const isDecimalSeparator =
            hasBothSeparators ||
            (digitsAfterLastSeparator > 0 &&
                digitsAfterLastSeparator <= 2);

        if (isDecimalSeparator) {
            const decimalIndex = lastSeparator.index;
            cleaned =
                numeric.slice(0, decimalIndex).replace(/[.,]/g, "") +
                "." +
                numeric.slice(decimalIndex + 1);
        } else {
            cleaned = numeric.replace(/[.,]/g, "");
        }
    }

    const price = Number(cleaned);

    return Number.isFinite(price) && price > 0
        ? price
        : null;
}

// Check schema types, including full schema.org URLs.
function hasType(data, expectedType) {
    const types = Array.isArray(data["@type"])
        ? data["@type"]
        : [data["@type"]];

    return types.some(type =>
        typeof type === "string" &&
        type.split("/").pop().split("#").pop() === expectedType
    );
}

// Find Product offers inside JSON-LD data.
function findProductOffers(data, results = []) {
    if (!data || typeof data !== "object") {
        return results;
    }

    if (Array.isArray(data)) {
        data.forEach(item => findProductOffers(item, results));
        return results;
    }

    if (hasType(data, "Product") && data.offers) {
        const offers = Array.isArray(data.offers)
            ? data.offers
            : [data.offers];

        offers.forEach(offer => {
            if (!offer || typeof offer !== "object") return;

            results.push({
                sellingPrice: parsePrice(
                    offer.price ?? offer.lowPrice
                ),
                currency: offer.priceCurrency || null
            });
        });
    }

    if (data["@graph"]) {
        findProductOffers(data["@graph"], results);
    }

    return results;
}

// Extract product prices from HTML.
function extractProductPrices(html) {
    const $ = cheerio.load(html);

    let sellingPrice = null;
    let originalPrice = null;
    let currency = null;
    let source = null;

    // 1. JSON-LD Product data.
    $("script[type='application/ld+json']").each((_, element) => {
        try {
            const jsonData = JSON.parse($(element).contents().text());
            const offers = findProductOffers(jsonData);

            const validOffer = offers.find(
                offer => offer.sellingPrice !== null
            );

            if (validOffer && sellingPrice === null) {
                sellingPrice = validOffer.sellingPrice;
                currency = validOffer.currency;
                source = "JSON-LD Product data";
            }
        } catch {
            // Ignore malformed JSON-LD.
        }
    });

    // 2. Product price metadata.
    if (sellingPrice === null) {
        const metaPrice = $(
            'meta[property="product:price:amount"]'
        ).attr("content");

        sellingPrice = parsePrice(metaPrice);

        if (sellingPrice !== null) {
            source = "Product price metadata";
        }
    }

    // 3. Currency metadata.
    currency =
        currency ||
        $('meta[property="product:price:currency"]').attr("content") ||
        null;

    // 4. Original price selectors.
    const originalSelectors = [
        "[data-original-price]",
        ".original-price",
        ".old-price",
        ".regular-price",
        ".compare-at-price",
        ".price--original",
        "del .amount",
        "del .price"
    ];

    for (const selector of originalSelectors) {
        const element = $(selector).first();

        if (element.length) {
            const value =
                element.attr("data-original-price") ||
                element.attr("content") ||
                element.text();

            originalPrice = parsePrice(value);

            if (originalPrice !== null) break;
        }
    }

    // 5. Selling price selectors.
    if (sellingPrice === null) {
        const sellingSelectors = [
            "[data-sale-price]",
            "[data-price]",
            ".sale-price",
            ".current-price",
            ".product-price",
            ".price"
        ];

        for (const selector of sellingSelectors) {
            const element = $(selector).first();

            if (element.length) {
                const value =
                    element.attr("data-sale-price") ||
                    element.attr("data-price") ||
                    element.attr("content") ||
                    element.text();

                sellingPrice = parsePrice(value);

                if (sellingPrice !== null) {
                    source = `HTML selector: ${selector}`;
                    break;
                }
            }
        }
    }

    return {
        sellingPrice,
        originalPrice,
        currency,
        source
    };
}

// Calculate discount percentage.
function calculateDiscount(originalPrice, sellingPrice) {
    if (
        originalPrice === null ||
        sellingPrice === null ||
        originalPrice <= sellingPrice
    ) {
        return null;
    }

    return Number(
        (
            ((originalPrice - sellingPrice) / originalPrice) * 100
        ).toFixed(2)
    );
}

// Calculate discount risk.
function calculateDiscountRisk(discountPercent) {
    if (discountPercent === null) return 0;

    const rule = DISCOUNT_RULES.find(
        item => discountPercent >= item.minimum
    );

    return rule ? rule.points : 0;
}

// Main price analysis function.
function priceCheck(html) {
    try {
        if (typeof html !== "string" || !html.trim()) {
            throw new Error("Valid HTML content is required");
        }

        const prices = extractProductPrices(html);

        const {
            sellingPrice,
            originalPrice,
            currency,
            source
        } = prices;

        // Missing selling price: analysis unavailable.
        if (sellingPrice === null) {
            return {
                points: 0,
                reasons: [
                    "Product selling price could not be identified. Price analysis is unavailable."
                ],
                failed: true,
                evidence: {
                    status: "insufficient-data",
                    sellingPrice: null,
                    originalPrice,
                    currency,
                    discountPercent: null,
                    extractionSource: source
                }
            };
        }

        const discountPercent = calculateDiscount(
            originalPrice,
            sellingPrice
        );

        const points = calculateDiscountRisk(discountPercent);
        const reasons = [];

        let status = "insufficient-data";

        if (originalPrice === null) {
            reasons.push(
                "Original price is unavailable for discount comparison"
            );
        } else if (sellingPrice >= originalPrice) {
            status = "no-discount";

            reasons.push("No discount was identified");
        } else {
            status = "analysis-completed";

            if (discountPercent >= 70) {
                reasons.push("Advertised discount is unusually high");
            } else if (discountPercent >= 50) {
                reasons.push("Advertised discount is significantly high");
            } else if (discountPercent >= 30) {
                reasons.push("Advertised discount is relatively high");
            } else {
                reasons.push(
                    "Advertised discount is within the configured range"
                );
            }
        }

        // Normal result: preserve the extracted prices.
        return {
            points,
            reasons,
            failed: originalPrice === null,
            evidence: {
                status,
                sellingPrice,
                originalPrice,
                currency,
                discountPercent,
                extractionSource: source
            }
        };

    } catch (error) {
        return {
            points: 0,
            reasons: ["Price analysis could not be completed"],
            failed: true,
            evidence: {
                status: "error",
                message: error.message
            }
        };
    }
}

module.exports = priceCheck;
