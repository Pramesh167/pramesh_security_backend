const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
});

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
module.exports = ActivityLog;