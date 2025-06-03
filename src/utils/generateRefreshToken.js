import jwt from "jsonwebtoken";

export const generateRefreshToken = (user) => {
    const payload = {
        id: user.id,
    };

    const secretKey = process.env.REFRESH_TOKEN_SECRET_KEY || "default";
    const refreshToken = jwt.sign(payload, secretKey, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES,
    });
    //console.log("Generated Refresh Token:", refreshToken);
    return refreshToken;
};
