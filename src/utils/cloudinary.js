import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "", // Click 'View API Keys' above to copy your Cloud Name
    api_key: process.env.CLOUDINARY_API_KEY || "", // Click 'View API Keys' above to copy your API Key
    api_secret: process.env.CLOUDINARY_API_SECRET || "", // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (filePath) => {
    try {
        if (!filePath) {
            throw new Error("File path is required for upload.");
        }
        const response = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto", // Automatically detect the resource type (image, video, etc.)
        });
        console.log("File uploaded successfully to Cloudinary.");
        console.log("Response:", response);
        return response;
    } catch (error) {
        fs.unlinkSync(filePath); // Delete the file if upload fails
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    }
};

export { uploadOnCloudinary };

// const uploadResult = await cloudinary.uploader
//     .upload(
//         "https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg",
//         {
//             public_id: "shoes",
//         }
//     )
//     .catch((error) => {
//         console.log(error);
//     });
