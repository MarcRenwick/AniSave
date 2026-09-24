const path = require("path");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Report = require("../models/Report");
const User = require("../models/User");
const validate = require("../utils/validate");
const { reportEvidencePath, deleteImageFile, sendStoredFile } = require("../utils/fileUtils");
const { disconnectUser } = require("../utils/realtime");

const { REASONS } = Report;

// A buyer can send a handful of reports a day - enough for a real problem,
// not enough to bury the admin (or one farmer) in them.
const MAX_REPORTS_PER_DAY = 5;
const OPEN_STATUSES = ["pending", "reviewed"];

// @desc    A buyer reports a farmer
// @route   POST /api/reports   (multipart: farmerId, reason, description, evidence[] - up to 5 photos, optional)
// @access  Private (buyer)
const createReport = asyncHandler(async (req, res) => {
  // multer has already saved any photos by the time a request is refused
  const files = req.files || [];
  const discardUploads = () => files.forEach((file) => deleteImageFile(reportEvidencePath(file)));

  try {
    const body = validate.plainBody(req.body);

    // Only an active farmer can be reported (a suspended one is out of the system already).
    const farmer =
      typeof body.farmerId === "string" && mongoose.isValidObjectId(body.farmerId)
        ? await User.findOne({ _id: body.farmerId, role: "farmer", isBanned: { $ne: true } })
        : null;
    if (!farmer) {
      res.status(404);
      throw new Error("Farmer not found");
    }

    if (typeof body.reason !== "string" || !REASONS.includes(body.reason)) {
      res.status(400);
      throw new Error("Choose a reason for your report");
    }

    if (typeof body.description !== "string" || !body.description.trim()) {
      res.status(400);
      throw new Error("Please describe what happened");
    }
    const description = validate.text(body.description, "The description", { max: 320 });

    // One open report per seller: sending the same complaint again only makes more to read.
    const alreadyOpen = await Report.exists({
      reporter: req.user._id,
      farmer: farmer._id,
      status: { $in: OPEN_STATUSES },
    });
    if (alreadyOpen) {
      res.status(400);
      throw new Error("You've already reported this seller. We're still reviewing your report.");
    }

    const today = await Report.countDocuments({
      reporter: req.user._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (today >= MAX_REPORTS_PER_DAY) {
      res.status(429);
      throw new Error("You've sent several reports today. Please try again tomorrow.");
    }

    const report = await Report.create({
      reporter: req.user._id,
      farmer: farmer._id,
      reason: body.reason,
      description,
      evidence: files.map(reportEvidencePath),
    });

    res.status(201).json({
      _id: report._id,
      status: report.status,
      message: "Your report has been submitted successfully. We'll review the information provided.",
    });
  } catch (err) {
    discardUploads();
    throw err;
  }
});

// What an admin sees of a report: who sent it, who it's about (their name,
// shop and account status), and who acted on it.
const withPeople = (query) =>
  query
    .populate("reporter", "name username")
    .populate("farmer", "name username farmName location isBanned suspendedAt")
    .populate("reviewedBy decidedBy", "name username");

const findReport = async (id, res) => {
  const report = mongoose.isValidObjectId(id) ? await Report.findById(id) : null;
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }
  return report;
};

// @desc    Every report, newest first, with its status
// @route   GET /api/admin/reports
// @access  Private (admin)
const getReports = asyncHandler(async (req, res) => {
  const reports = await withPeople(Report.find().sort({ createdAt: -1 }));
  res.json(reports);
});

// @desc    An admin has opened a report: it moves from Pending to Reviewed
//          (and stays wherever it is if it was already past that)
// @route   PATCH /api/admin/reports/:id/review
// @access  Private (admin)
const markReviewed = asyncHandler(async (req, res) => {
  const report = await findReport(req.params.id, res);

  if (report.status === "pending") {
    report.status = "reviewed";
    report.reviewedAt = new Date();
    report.reviewedBy = req.user._id;
    await report.save();
  }

  res.json(await withPeople(Report.findById(report._id)));
});

// @desc    The admin's final decision: dismiss the report, or suspend the farmer
// @route   PATCH /api/admin/reports/:id/decision   { action: "dismiss" | "suspend", note }
// @access  Private (admin)
const decideReport = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  if (body.action !== "dismiss" && body.action !== "suspend") {
    res.status(400);
    throw new Error("Choose whether to dismiss the report or suspend the farmer");
  }
  const note = validate.optionalText(body.note, "The note", { max: 500 });
  if (body.action === "suspend" && !note) {
    res.status(400);
    throw new Error("A reason is required when suspending a farmer");
  }

  const report = await findReport(req.params.id, res);
  if (!OPEN_STATUSES.includes(report.status)) {
    res.status(400);
    throw new Error("This report has already been decided");
  }

  if (body.action === "suspend") {
    const farmer = await User.findOne({ _id: report.farmer, role: "farmer" });
    if (!farmer) {
      res.status(404);
      throw new Error("That farmer no longer exists");
    }

    // A farmer who is already banned or suspended stays as they are; either
    // way the report is settled.
    if (!farmer.isBanned) {
      farmer.isBanned = true;
      farmer.suspendedAt = new Date();
      farmer.suspensionReason = note;
      // Whatever they are signed in on stops working with the suspension.
      farmer.tokenVersion = (farmer.tokenVersion || 0) + 1;
      await farmer.save();
      disconnectUser(farmer._id);
    }
  }

  report.status = body.action === "suspend" ? "suspended" : "dismissed";
  report.decidedAt = new Date();
  report.decidedBy = req.user._id;
  report.decisionNote = note || undefined;
  if (!report.reviewedAt) {
    report.reviewedAt = report.decidedAt;
    report.reviewedBy = req.user._id;
  }
  await report.save();

  res.json(await withPeople(Report.findById(report._id)));
});

// @desc    One photo attached to a report
// @route   GET /api/report-evidence/:filename
// @access  Private - the buyer who sent it, or an admin. Anyone else is told
//          it doesn't exist, so it doesn't confirm a file is there.
const getEvidence = asyncHandler(async (req, res) => {
  const filename = path.basename(String(req.params.filename));

  if (req.user.role !== "admin") {
    const mine = await Report.exists({ reporter: req.user._id, evidence: `/report-evidence/${filename}` });
    if (!mine) {
      res.status(404);
      throw new Error("Evidence not found");
    }
  }

  const sent = await sendStoredFile(res, `/report-evidence/${filename}`, {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  });
  if (!sent) {
    res.status(404);
    throw new Error("Evidence not found");
  }
});

module.exports = { createReport, getReports, markReviewed, decideReport, getEvidence };
