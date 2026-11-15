
const mongoose = require("mongoose");

const factorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    points: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },

    reasons: [{
        type: String
    }],

    failed: {
        type: Boolean,
        default: false
    },

    evidence: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, { _id: false });


const scanSchema = new mongoose.Schema({

    domain: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },

    score: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },

    level: {
        type: String,
        required: true,
        enum: ["Low Risk", "Medium Risk", "High Risk"]
    },

    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },

    factors: {
        type: [factorSchema],
        validate: {
            validator: value => value.length === 6,
            message: "A scan must contain exactly six factors"
        }
    },

    status: {
        type: String,
        enum: ["completed", "partial"],
        default: "completed"
    },

    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400
    }

}, {
    versionKey: false
});

scanSchema.index({ domain: 1, createdAt: -1 });

module.exports = mongoose.model("Scan", scanSchema);
