// utils/mongoHelpers.js

/**
 * Build MongoDB aggregation pipeline for bookings.
 * @param {Object} options
 * @param {String} options.userId - Optional: filter by specific user ID
 * @param {String} options.date - Optional: filter by slot date (YYYY-MM-DD)
 * @param {String} options.search - Optional: search by user name or email
 * @param {String} options.status - Optional: filter by booking status
 * @returns {Array} Aggregation pipeline for MongoDB
 */
export const buildBookingPipeline = ({ userId, date, search, status } = {}) => {
  const pipeline = [];

  // Filter by user ID
  if (userId) {
    pipeline.push({ $match: { "user._id": userId } });
  }

  // Join with slots collection
  pipeline.push({
    $lookup: {
      from: "slots",
      localField: "slotId",
      foreignField: "_id",
      as: "slot",
    },
  });

  // Flatten the slot array
  pipeline.push({ $unwind: "$slot" });

  // Filter by slot date
  if (date) {
    pipeline.push({ $match: { "slot.date": date } });
  }

  // Search by user name or email
  if (search) {
    const regex = new RegExp(search, "i");
    pipeline.push({
      $match: {
        $or: [{ "user.name": regex }, { "user.email": regex }],
      },
    });
  }

  // Filter by booking status (skip if status is "all" or undefined)
  if (status && status !== "all") {
    pipeline.push({ $match: { status } });
  }

  // Sort by newest first
  pipeline.push({ $sort: { createdAt: -1 } });

  return pipeline;
};

/**
 * Add pagination stages to an aggregation pipeline.
 * @param {Array} pipeline - Existing aggregation pipeline
 * @param {Number} page - Current page number (1-based)
 * @param {Number} limit - Items per page
 * @returns {Array} Pipeline with $skip and $limit added
 */
export const paginatePipeline = (pipeline, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return [...pipeline, { $skip: skip }, { $limit: Number(limit) }];
};
