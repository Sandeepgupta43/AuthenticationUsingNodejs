import connectDB from "../DB/index.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import { generateAccessToken } from "../utils/generateAccessToken.js";
import { generateRefreshToken } from "../utils/generateRefreshToken.js";
import jwt from "jsonwebtoken";
import { generateHashPassword } from "../utils/generateHashPassword.js";
import { resolve } from "path";
import { rejects } from "assert";

const db = connectDB();

const generateAccessAndRefreshTokens = async (user) => {
    //console.log("Generating access and refresh tokens for user:", user);
    try {
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        const updatedUser = await new Promise((resolve, reject) => {
            db.query(
                "update user set refreshToken = ? where id = ?",
                [refreshToken, user.id],
                (error, result) => {
                    if (error) {
                        console.error(
                            "Error updating user refresh token:",
                            error
                        );
                        throw new Error("Failed to update user refresh token");
                    }
                    //console.log("User refresh token updated successfully");
                    resolve(result);
                }
            );
        });
        if (!updatedUser) {
            throw new Error("Failed to update user refresh token");
        }
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName || null,
                avatar: user.avatar || null,
                coverImage: user.coverImage || null,
                createdAt: user.createdAt || new Date(),
            },
        };
    } catch (error) {
        console.error("Error generating tokens:", error);
        throw new Error("Token generation failed");
    }
};

const registerUser = async (req, res) => {
    const { username, email, password, fullName, createdAt } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            message: "Username, email, and password are required",
        });
    }

    if (username.length < 3 || username.length > 20) {
        return res.status(400).json({
            message: "Username must be between 3 and 20 characters",
        });
    }

    if (password.length < 6 || password.length > 20) {
        return res.status(400).json({
            message: "Password must be between 6 and 20 characters",
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: "Invalid email format",
        });
    }

    try {
        // Check if username or email already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.query(
                "SELECT * FROM user WHERE username = ? OR email = ?",
                [username, email],
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
        });

        if (existingUser.length > 0) {
            return res.status(400).json({
                message: "Username or email already exists",
            });
        }

        // Handle file uploads
        const avatarImagePath = req?.files?.avatar?.[0]?.path;
        const coverImagePath = req?.files?.coverImage?.[0]?.path;

        if (!avatarImagePath) {
            return res.status(400).json({
                message: "Avatar image is required",
            });
        }

        const uploadedAvatar = await uploadOnCloudinary(
            avatarImagePath,
            "avatars"
        );
        const uploadedCover = coverImagePath
            ? await uploadOnCloudinary(coverImagePath, "covers")
            : null;

        if (!uploadedAvatar) {
            return res.status(500).json({
                message: "Failed to upload avatar image",
            });
        }

        // Hash the password
        const hashedPassword = generateHashPassword(password);

        // Insert user - only store the URLs, not the entire objects
        const insertResult = await new Promise((resolve, reject) => {
            db.query(
                `INSERT INTO user 
            (username, email, password, avatar, fullName, coverImage, createdAt,refreshToken) 
            VALUES (?, ?, ?, ?, ?, ?, ?,?)`,
                [
                    username.toLowerCase(),
                    email,
                    hashedPassword,
                    uploadedAvatar.secure_url, // Store only the secure_url
                    fullName || null,
                    uploadedCover ? uploadedCover.secure_url : null, // Store only the secure_url if exists
                    createdAt || new Date(),
                    "", // refreshToken is not needed at registration
                ],
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
        });

        if (!insertResult || !insertResult.insertId) {
            return res.status(500).json({
                message: "Failed to register user",
            });
        }

        fs.unlinkSync(avatarImagePath); // Clean up the uploaded file
        if (coverImagePath) {
            fs.unlinkSync(coverImagePath); // Clean up the cover image file if it exists
        }
        // Send response
        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: insertResult.insertId,
                username: username.toLowerCase(),
                email,
                fullName,
                avatar: uploadedAvatar,
                coverImage: uploadedCover || "",
                createdAt: createdAt || new Date(),
            },
        });
    } catch (error) {
        console.error("Error during registration:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

const loginUser = async (req, res) => {
    //console.log("Login request received");
    // Getting data from request
    const { email, password, username } = req.body;
    //console.log("Login data:", email);

    // Checking if username or email cames from request
    if (!(email && username)) {
        return res.status(400).json({
            message: "Email or username is required",
        });
    }
    // Checking if password is not null
    if (!password) {
        return res.status(400).json({
            message: "Password is requered",
        });
    }

    // Check if user alredy exist in database
    try {
        //console.log("Checking existing user in database...");
        const existingUser = await new Promise((resolve, reject) => {
            db.query(
                "select * from user where username = ? OR email = ?",
                [username, email],
                (error, result) => {
                    if (error) {
                        console.log("error", error);
                        return reject(error);
                    }
                    resolve(result);
                }
            );
        });

        //console.log("Existing user:", existingUser);
        // If user not found
        if (existingUser.length === 0) {
            return res.status(404).json({
                message: "User not found",
            });
        }
        //console.log("User found:", existingUser[0].password);
        // If user found, check if password is correct
        // Note: bcrypt.compareSync is used for synchronous comparison, but you can also use bcrypt.compare for asynchronous comparison.
        const isPasswordCorrect = bcrypt.compareSync(
            password,
            existingUser[0].password
        );
        //If password is incorrect
        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Incorrect password",
            });
        }
        //console.log("Password is correct, generating tokens...");
        // Generate access and refresh tokens
        const { accessToken, refreshToken, user } =
            await generateAccessAndRefreshTokens(existingUser[0]);
        // Set the refresh token in the response cookies

        console.log("Tokens generated successfully:", {
            accessToken,
            refreshToken,
            user,
        });

        const option = {
            httpOnly: true,
            secure: true,
        };
        return res
            .status(200)
            .cookie("refreshToken", refreshToken, option)
            .cookie("accessToken", accessToken, option)
            .json({
                message: "Login successful",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName || null,
                    avatar: user.avatar || null,
                    coverImage: user.coverImage || null,
                    createdAt: user.createdAt || new Date(),
                },
            });
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

const logoutUser = async (req, res) => {
    const { userId } = req.user;
    try {
        await new Promise((resolve, reject) => {
            db.query(
                "UPDATE user set refreshToken = null where id = ?",
                [userId],
                (error, result) => {
                    if (error) {
                        console.error(
                            "Error updating user refresh token:",
                            error
                        );
                        return reject(error);
                    }
                    resolve(result);
                }
            );
        });
        const option = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .clearCookie("refreshToken", option)
            .clearCookie("accessToken", option)
            .json({
                message: "Logout successful",
            });
    } catch (error) {
        console.error("Error during logout:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

const refreshAccessToken = async (req, res) => {
    //console.log("Inside refresh token");
    const incommingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;
    if (!incommingRefreshToken) {
        return res.status(400).json({
            message: "Unauthorize access",
        });
    }
    //console.log("Incomming refresh token : ",incommingRefreshToken);

    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN
        );
        console.log("Decoded Token : ", decodedToken);
        const user = await new Promise((resolve, reject) => {
            db.query(
                "select * from user where id = ?;",
                [decodedToken.id],
                (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(result);
                }
            );
        });
        //console.log("after db query -> ", user[0]);
        const currUser = user[0];

        if (!currUser) {
            return res.status(401).json({
                message: "Invaild refresh token",
            });
        }

        if (incommingRefreshToken !== currUser.refreshToken) {
            return res.status(401).json({
                message: "Refresh token either expire or used",
            });
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshTokens(currUser.id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json({
                message: "Access token refreshed success",
                user: {
                    id: currUser.id,
                    email: currUser.email,
                    username: currUser.username || null,
                },
            });
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

const currentPasswordChange = async (req, res) => {
    //console.log("inside chnaging password");
    const { oldPassword, newPassword } = req.body;
    //console.log("Password : ",{oldPassword,newPassword});
    try {
        const user = await new Promise((resolve, reject) => {
            db.query(
                "select * from user where id = ?;",
                [req.user.id],
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
        });
        //console.log("user : ",user);
        const isPasswordCorrect = bcrypt.compareSync(
            oldPassword,
            user[0].password
        );
        //console.log("Is password correct : ",isPasswordCorrect);

        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "Password is incorrect",
            });
        }
        console.log("after check is password correct");
        const hashedPassword = generateHashPassword(newPassword);
        console.log("hashed password : ",hashedPassword);
        const currUser = user[0];
        console.log("current user : ",currUser);

        const newUser = await new Promise((resolve, reject) => {
            db.query(
                "update user set password = ? where id = ?;",
                [hashedPassword, currUser.id],
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
        });
        console.log("New User : ",newUser);

        return res.status(200).json({
            message: "Password chnage success",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

const getCurrentUser = async (req, res) => {
    return res.status(200).json({
        message: "Current User fetch success",
        user:req.user
    });
};

const updateUserAccount = async (req, res) => {
    const { username, email, fullName } = req.body;

    if (!fullName || !email) {
        return res.status(400).json({
            message: "All fields are required",
        });
    }

    try {
        const user = await new Promise((resolve, reject) => {
            db.query(
                "update user set email = ?,fullName = ? where id = ?",
                [email, fullName, req.user.id],
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
        });
        return res.status(200).json({
            message: "User updated",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

const updateUserAvtar = async (req, res) => {
    const avtarLocalPath = req.file.path;
    if (!avtarLocalPath) {
        return res.status(400).json({
            message: "Avtar file is required",
        });
    }
    try {
        const avatar = await uploadOnCloudinary(avtarLocalPath);

        if (!avatar.url) {
            return res.status(400).json({
                message: "Error while uploading avatar",
            });
        }

        await new Promise((resolve, reject) => {
            db.query(
                "update user set avatar = ? where id = ?;",
                [avatar.url, req.user.id],
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
        });

        return res.status(200).json({
            message: "Avatar updated successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};
const updateCoverImage = async (req, res) => {
    const coverImageLocalPath = req.file.path;

    if (!coverImageLocalPath) {
        return res.status(400).json({
            message: "Cover image is required",
        });
    }
    try {
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if (!coverImage) {
            return res.status(400).json({
                message: "Error while uploading cover image",
            });
        }

        await new Promise((resolve, reject) => {
            db.query(
                "update user set coverImage = ? where id = ?;",
                [coverImage.url, req.user.id],
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
        });

        return res.status(200).json({
            message: "Cover Image updated successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    currentPasswordChange,
    getCurrentUser,
    updateUserAccount,
    updateUserAvtar,
    updateCoverImage,
};
