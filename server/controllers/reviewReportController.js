const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Rating = require("../models/Rating");
const ReviewReport = require("../models/ReviewReport");
const User = require("../models/User");
const validate = require("../utils/validate");

const { REASONS } = ReviewReport;

// Enough for a real problem, not enough to bury the admin in reports.
const MAX_REVIEW_REPORTS_PER_DAY = 10;
const OPEN_STATUSES = ["pending", "reviewed"];

// What an admin can do about a report, and the status it ends up with.
const DECISIONS = { dismiss: "dismissed", remove: "removed", suspend: "suspended" };

// Everything the reporter has chosen, checked: the review exists and is theirs
// to report, the reason is a real one, "other" has been explained, and they
// haven't already reported this review or sent too many today.
async function checkReport(req, res) {
  const body = validate.plainBody(req.body);

  const rating =
    typeof body.ratingId === "string" && mongoose.isValidObjectId(body.ratingId)
      ? await Rating.findOne({ _id: body.ratingId, removedAt: null })
      : null;
  if (!rating) {
    res.status(404);
    throw new Error("Review not found");
  }

  // Buyers report other people's reviews; a farmer reports what was written
  // about their own products.
  if (req.user.role === "buyer") {
    if (rating.buyer.equals(req.user._id)) {
      res.status(400);
      throw new Error("You can't report your own review");
    }
  } else if (!rating.farmer.equals(req.user._id)) {
    res.status(403);
    throw new Error("You can only report reviews of your own products");
  }

  if (typeof body.reason !== "string" || !REASONS.includes(body.reason)) {
    res.status(400);
    throw new Error("Choose a reason for your report");
  }

  // The other reasons speak for themselves; "Other Violations" has to be explained.
  let description;
  if (body.reason === "other") {
    if (typeof body.description !== "string" || !body.description.trim()) {
      res.status(400);
      throw new Error("Please describe the violation");
    }
    description = validate.text(body.description, "The description", { max: 320 });
  }

  if (await ReviewReport.exists({ reporter: req.user._id, rating: rating._id })) {
    res.status(400);
    throw new Error("You've already reported this review. We're still looking into it.");
  }

  const today = await ReviewReport.countDocuments({
    reporter: req.user._id,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
  if (today >= MAX_REVIEW_REPORTS_PER_DAY) {
    res.status(429);
    throw new Error("You've sent several reports today. Please try again tomorrow.");
  }

  return { rating, reason: body.reason, description };
}

// @desc    Report a review
// @route   POST /api/review-reports   { ratingId, reason, description? }
// @access  Private (buyer, or the farmer whose product was reviewed)
const createReviewReport = asyncHandler(async (req, res) => {
  const { rating, reason, description } = await checkReport(req, res);

  let report;
  try {
    report = await ReviewReport.create({
      reporter: req.user._id,
      rating: rating._id,
      reviewAuthor: rating.buyer,
      product: rating.product,
      reason,
      description,
      reviewSnapshot: { stars: rating.stars, comment: rating.comment },
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400);
      throw new Error("You've already reported this review. We're still looking into it.");
    }
    throw err;
  }

  res.status(201).json({
    _id: report._id,
    status: report.status,
    message:
      "Thank you for helping us maintain a safe and trustworthy marketplace. Your report has been submitted and will be reviewed by our team.",
  });
});

// What an admin sees of a report: who sent it, who wrote the review, which
// product it was on, and who acted on it.
const withPeople = (query) =>
  query
    .populate("reporter reviewAuthor", "name username role isBanned suspendedAt")
    .populate("product", "title")
    .populate("rating", "removedAt")
    .populate("reviewedBy decidedBy", "name username");

const findReport = async (id, res) => {
  const report = mongoose.isValidObjectId(id) ? await ReviewReport.findById(id) : null;
  if (!report) {
    res.status(404);
    throw new Error("Report not found");
  }
  return report;
};

// @desc    Every review report, newest first, with its status
// @route   GET /api/admin/review-reports
// @access  Private (admin)
const getReviewReports = asyncHandler(async (req, res) => {
  res.json(await withPeople(ReviewReport.find().sort({ createdAt: -1 })));
});

// @desc    An admin has opened a report: it moves from Pending to Reviewed
//          (and stays wherever it is if it was already past that)
// @route   PATCH /api/admin/review-reports/:id/review
// @access  Private (admin)
const markReviewed = asyncHandler(async (req, res) => {
  const report = await findReport(req.params.id, res);

  if (report.status === "pending") {
    report.status = "reviewed";
    report.reviewedAt = new Date();
    report.reviewedBy = req.user._id;
    await report.save();
  }

  res.json(await withPeople(ReviewReport.findById(report._id)));
});

// @desc    The admin's final decision: dismiss the report, remove the review, or
//          remove it and suspend the person who wrote it
// @route   PATCH /api/admin/review-reports/:id/decision   { action: "dismiss" | "remove" | "suspend", note }
// @access  Private (admin)
const decideReviewReport = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  if (typeof body.action !== "string" || !Object.hasOwn(DECISIONS, body.action)) {
    res.status(400);
    throw new Error("Choose whether to dismiss the report, remove the review or suspend its author");
  }
  const note = validate.optionalText(body.note, "The note", { max: 500 });
  if (body.action === "suspend" && !note) {
    res.status(400);
    throw new Error("A reason is required when suspending someone");
  }

  const report = await findReport(req.params.id, res);
  if (!OPEN_STATUSES.includes(report.status)) {
    res.status(400);
    throw new Error("This report has already been decided");
  }

  if (body.action === "suspend") {
    const author = await User.findById(report.reviewAuthor);
    if (!author) {
      res.status(404);
      throw new Error("That user no longer exists");
    }
    if (author.role === "admin") {
      res.status(400);
      throw new Error("An administrator can't be suspended from here");
    }

    // Someone already banned or suspended stays as they are; either way the report is settled.
    if (!author.isBanned) {
      author.isBanned = true;
      author.suspendedAt = new Date();
      author.suspensionReason = note;
      // Whatever they are signed in on stops working with the suspension.
      author.tokenVersion = (author.tokenVersion || 0) + 1;
      await author.save();
    }
  }

  // Taking a review down hides it and stops it counting towards the product's
  // and the farmer's rating.
  if (body.action !== "dismiss") {
    await Rating.updateOne({ _id: report.rating, removedAt: null }, { $set: { removedAt: new Date() } });
  }

  report.status = DECISIONS[body.action];
  report.decidedAt = new Date();
  report.decidedBy = req.user._id;
  report.decisionNote = note || undefined;
  if (!report.reviewedAt) {
    report.reviewedAt = report.decidedAt;
    report.reviewedBy = req.user._id;
  }
  await report.save();

  res.json(await withPeople(ReviewReport.findById(report._id)));
});

module.exports = { createReviewReport, getReviewReports, markReviewed, decideReviewReport };
