
const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    reason: {
      type: String,
      required: true,
      enum: [
        "Fake payment page",
        "Fake discounts",
        "Phishing",
        "Product scam",
        "Non-delivery",
        "Other"
      ]
    },

    description: {
      type: String,
      maxlength: 500,
      trim: true,
      default: ""
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    reviewedAt: {
      type: Date,
      default: null
    },

    reviewNote: {
      type: String,
      maxlength: 500,
      default: ""
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

reportSchema.index({
  domain: 1,
  status: 1,
  createdAt: -1
});

module.exports = mongoose.model("Report", reportSchema);


