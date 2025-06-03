import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        username: user.username,
    };
    const secretKey = process.env.JWT_SECRET_KEY || "defaultSecretKey";
    const token = jwt.sign(payload, secretKey, {
        expiresIn: process.env.SECRET_TOKEN_EXPIRES, // Token expiration time
    });
    //console.log("Generated Access Token:", token);
    return token;
};
