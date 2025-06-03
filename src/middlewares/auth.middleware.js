import jwt from 'jsonwebtoken';

export const verifyJWT = async (req,res,next) => {
    const token = req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Access token is missing" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;
        
        next();
    } catch (error) {
        console.error("JWT verification failed:", error);
        return res.status(403).json({ message: "Invalid or expired access token" });
    }
}