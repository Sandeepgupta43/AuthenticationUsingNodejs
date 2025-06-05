import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    updateUserAccount,
    updateUserAvtar,
    updateCoverImage,
    currentPasswordChange,
    getUserChannelProfile,
    getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    registerUser
);
router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/user").get(verifyJWT, getCurrentUser);
router.route("/change-password").post(verifyJWT, currentPasswordChange);
router.route("/update-account").patch(verifyJWT, updateUserAccount);
router
    .route("/update-avatar")
    .patch(verifyJWT, upload.single("avatar"), updateUserAvtar);
router
    .route("/update-cover-image")
    .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);
router
    .route("/channel-profile/:username")
    .get(verifyJWT, getUserChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);
export default router;
