
const test = require("node:test");
const assert = require("node:assert/strict");

const priceCheck = require("../services/priceCheck");

test("Detects an unusually high discount", () => {
    const html = `
        <div class="product">
            <span class="original-price">10000</span>
            <span class="sale-price">1000</span>
        </div>
    `;

    const result = priceCheck(html);

    assert.equal(result.points, 25);
    assert.equal(result.evidence.discountPercent, 90);
    assert.equal(result.failed, false);
});

test("Detects a significantly high discount", () => {
    const html = `
        <div class="product">
            <span class="original-price">10000</span>
            <span class="sale-price">4000</span>
        </div>
    `;

    const result = priceCheck(html);

    assert.equal(result.points, 15);
    assert.equal(result.evidence.discountPercent, 60);
});

test("Does not flag a normal discount", () => {
    const html = `
        <div class="product">
            <span class="original-price">10000</span>
            <span class="sale-price">8500</span>
        </div>
    `;

    const result = priceCheck(html);

    assert.equal(result.points, 0);
    assert.equal(result.evidence.discountPercent, 15);
});

test("Handles missing original price", () => {
    const html = `
        <div class="product">
            <span class="sale-price">1000</span>
        </div>
    `;

    const result = priceCheck(html);

    assert.equal(result.points, 0);
    assert.equal(result.failed, true);
    assert.equal(result.evidence.status, "insufficient-data");
});

test("Handles invalid HTML input", () => {
    const result = priceCheck("");

    assert.equal(result.failed, true);
    assert.equal(result.points, 0);
});

test("Extracts prices from JSON-LD Product data", () => {
    const html = `
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Example Product",
            "offers": {
                "@type": "Offer",
                "price": "2000",
                "priceCurrency": "INR"
            }
        }
        </script>
    `;

    const result = priceCheck(html);

    assert.equal(result.evidence.sellingPrice, 2000);
    assert.equal(result.evidence.currency, "INR");
});

test("Parses common comma-decimal and grouped price formats", () => {
    const cases = [
        [
            "<del class='original-price'>₹2,00,000.00</del><span class='sale-price'>₹1,23,456.78</span>",
            123456.78
        ],
        [
            "<del class='original-price'>€2.000,00</del><span class='sale-price'>€1.234,56</span>",
            1234.56
        ],
        [
            "<del class='original-price'>2 000,00</del><span class='sale-price'>1 299,50</span>",
            1299.5
        ],
        [
            "<del class='original-price'>2,000</del><span class='sale-price'>₹1,299</span>",
            1299
        ]
    ];

    for (const [html, expectedPrice] of cases) {
        const result = priceCheck(html);

        assert.equal(result.failed, false);
        assert.equal(result.evidence.sellingPrice, expectedPrice);
    }
});

test("Calculates discount thresholds and avoids negative discounts", () => {
    const cases = [
        [70, 25],
        [50, 15],
        [30, 8],
        [29, 0],
        [0, 0]
    ];

    for (const [discount, expectedPoints] of cases) {
        const sellingPrice = 100 - discount;
        const html = `
            <del class="original-price">100</del>
            <span class="sale-price">${sellingPrice}</span>
        `;
        const result = priceCheck(html);

        assert.equal(
            result.evidence.discountPercent,
            discount === 0 ? null : discount
        );
        assert.equal(result.points, expectedPoints);
    }

    const higherSellingPrice = priceCheck(`
        <del class="original-price">100</del>
        <span class="sale-price">120</span>
    `);
    assert.equal(higherSellingPrice.points, 0);
    assert.equal(higherSellingPrice.evidence.discountPercent, null);
});

test("Treats missing selling price as unavailable", () => {
    const result = priceCheck("<html><body>Product details</body></html>");

    assert.equal(result.failed, true);
    assert.equal(result.evidence.status, "insufficient-data");
    assert.equal(result.evidence.sellingPrice, null);
});
