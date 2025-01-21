const ActivityLog = require("../models/activityLogModel");
const User = require("../models/userModel");
// Get all user activities
const getAllUserActivities = async (req, res) => {
  try {
    const activities = await ActivityLog.find()
      .populate("user", "firstName lastName email phoneNumber")
      .sort({ timestamp: -1 });
      console.log("Activities fetched:", activities); // Log fetched activities

    res.status(200).json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete a user and their activities
const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    // Delete user
    await User.findByIdAndDelete(userId);

    // Delete user's activities
    await ActivityLog.deleteMany({ user: userId });

    res.status(200).json({
      success: true,
      message: "User and their activities deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { getAllUserActivities, deleteUser };
