
const axios = require("axios");
const normalizeDomain = require("../utils/normalizeDomain");

// Domain age thresholds and corresponding risk points.
const AGE_RISK_RULES = [
    { maxDays: 30, points: 25 },
    { maxDays: 90, points: 18 },
    { maxDays: 180, points: 12 },
    { maxDays: 365, points: 6 }
];

// Retrieve registration date using RDAP.
async function getDomainRegistrationDate(domain) {
    const response = await axios.get(
        `https://rdap.org/domain/${encodeURIComponent(domain)}`,
        {
            timeout: 10000,
            headers: {
                Accept: "application/rdap+json"
            }
        }
    );

    const events = response.data.events || [];

    const registrationEvent = events.find(event =>
        ["registration", "registered"].includes(
            (event.eventAction || "").toLowerCase()
        )
    );

    if (!registrationEvent || !registrationEvent.eventDate) {
        throw new Error("Domain registration date is unavailable");
    }

    return registrationEvent.eventDate;
}

// Calculate the age of the domain.
function calculateDomainAge(registrationDate) {
    const registeredAt = new Date(registrationDate);

    if (Number.isNaN(registeredAt.getTime())) {
        throw new Error("Invalid domain registration date");
    }

    const now = new Date();

    if (registeredAt > now) {
        throw new Error("Invalid future registration date");
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    return Math.floor(
        (now.getTime() - registeredAt.getTime()) / millisecondsPerDay
    );
}

// Assign risk points based on domain age.
function calculateAgeRisk(ageInDays) {
    const rule = AGE_RISK_RULES.find(
        item => ageInDays < item.maxDays
    );

    return rule ? rule.points : 0;
}

// Main domain age verification function.
async function domainAgeCheck(inputUrl) {
    try {
        const normalized = normalizeDomain(inputUrl);

        const { domain, isIP } = normalized;

        // IP addresses do not have domain registration ages.
        if (isIP) {
            return {
                points: 0,
                reasons: [],
                failed: true,
                evidence: {
                    domain,
                    status: "not-applicable",
                    message: "IP addresses do not have domain registration dates"
                }
            };
        }

        // Retrieve the original registration date.
        const registrationDate =
            await getDomainRegistrationDate(domain);

        // Calculate domain age.
        const ageInDays =
            calculateDomainAge(registrationDate);

        // Calculate risk points.
        const points = calculateAgeRisk(ageInDays);

        const reasons = [];

        if (ageInDays < 30) {
            reasons.push(
                "Domain was registered less than 30 days ago"
            );
        } else if (ageInDays < 90) {
            reasons.push(
                "Domain was registered less than 90 days ago"
            );
        } else if (ageInDays < 180) {
            reasons.push(
                "Domain is less than 6 months old"
            );
        } else if (ageInDays < 365) {
            reasons.push(
                "Domain is less than 1 year old"
            );
        } else {
            reasons.push(
                "Domain is more than 1 year old"
            );
        }

        return {
            points,
            reasons,
            failed: false,
            evidence: {
                domain,
                registrationDate,
                ageInDays,
                ageInYears: Number(
                    (ageInDays / 365).toFixed(2)
                ),
                status: "success"
            }
        };

    } catch (error) {
        // An unavailable RDAP service must not be treated as proof of safety.
        return {
            points: 0,
            reasons: [],
            failed: true,
            evidence: {
                status: "unavailable",
                message: error.response?.status === 404
                    ? "Registration information was not found"
                    : error.message
            }
        };
    }
}

module.exports = domainAgeCheck;
module.exports.calculateAgeRisk = calculateAgeRisk;
module.exports.calculateDomainAge = calculateDomainAge;
