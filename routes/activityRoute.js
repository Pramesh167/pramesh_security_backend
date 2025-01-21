const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");
const { authGuard, isAdmin, adminGuard } = require("../middleware/authGuard");

// Get all user activities (Admin only)
router.get(
  "/activities",
  adminGuard,

  activityController.getAllUserActivities
);

// Delete a user (Admin only)
router.delete(
  "/delete_user/:userId",

  adminGuard,

  activityController.deleteUser
);

module.exports = router;