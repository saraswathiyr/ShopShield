
const mongoose = require("mongoose");
const Joi = require("joi");
const Report = require("../models/Report");

// GET: Retrieve reports by status
const getReports = async (req, res) => {
    try {
        const status = req.query.status || "pending";

        if (!["pending", "approved", "rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid report status."
            });
        }

        const reports = await Report.find({ status })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.status(200).json({
            success: true,
            count: reports.length,
            reports
        });

    } catch (error) {
        console.error("Get reports error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve reports."
        });
    }
};

// PATCH: Approve or reject a pending report
const reviewReport = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid report ID."
            });
        }

        const schema = Joi.object({
            status: Joi.string()
                .valid("approved", "rejected")
                .required(),

            reviewNote: Joi.string()
                .trim()
                .max(500)
                .allow("")
                .default("")
        });

        const { error, value } = schema.validate(req.body || {});

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const report = await Report.findOneAndUpdate(
            {
                _id: id,
                status: "pending"
            },
            {
                $set: {
                    status: value.status,
                    reviewNote: value.reviewNote,
                    reviewedAt: new Date()
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "Pending report not found or already reviewed."
            });
        }

        return res.status(200).json({
            success: true,
            message: `Report ${value.status} successfully.`,
            report
        });

    } catch (error) {
        console.error("Review report error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to review report."
        });
    }
};

module.exports = {
    getReports,
    reviewReport
};
