import { Router } from "express";
import { registerUser,loginUser, logoutUser, refreshAccessToken, getCurrentUser, updateUserAccount, updateUserAvtar, updateCoverImage, currentPasswordChange } from "../controllers/user.controller.js";
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
router.route('/login').post(loginUser);

router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/user").get(verifyJWT,getCurrentUser);
router.route("/change-password").post(verifyJWT,currentPasswordChange);
router.route("/update-account").post(verifyJWT,updateUserAccount);
router.route("/update-avatar").post(verifyJWT,updateUserAvtar);
router.route("/update-cover-image").post(verifyJWT,updateCoverImage);

export default router;
