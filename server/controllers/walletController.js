const asyncHandler = require("express-async-handler");
const TopUpRequest = require("../models/TopUpRequest");

// @desc    Request a wallet top-up (needs admin approval before it's credited)
// @route   POST /api/wallet/topup-request
// @access  Private (buyer)
const requestTopUp = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error("A positive top-up amount is required");
  }

  const request = await TopUpRequest.create({ buyer: req.user._id, amount });
  res.status(201).json(request);
});

// @desc    Get the logged-in buyer's own top-up requests
// @route   GET /api/wallet/my-requests
// @access  Private (buyer)
const getMyTopUpRequests = asyncHandler(async (req, res) => {
  const requests = await TopUpRequest.find({ buyer: req.user._id }).sort({ createdAt: -1 });
  res.json(requests);
});

module.exports = { requestTopUp, getMyTopUpRequests };
