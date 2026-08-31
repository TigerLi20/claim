const { v2: cloudinary } = require("cloudinary");

function bufferToDataUrl(buffer, mimeType = "image/jpeg") {
    if (!buffer) return null;
    const base64 = buffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
}

function cloudinaryConfigured() {
    return !!process.env.CLOUDINARY_CLOUD_NAME && !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET;
}

function isRemoteImageUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;

    try {
        const parsed = new URL(value);
        const hostname = parsed.hostname.toLowerCase();
        const hasImageExtension = /\.(jpe?g|png|webp|gif|avif|bmp|svg)(?:[?#]|$)/i.test(parsed.pathname);
        const isCloudinary = hostname.includes("cloudinary.com") || hostname.includes("res.cloudinary.com");

        return parsed.protocol === "https:" && (isCloudinary || hasImageExtension);
    } catch {
        return false;
    }
}

function isValidImageString(value) {
    if (typeof value !== "string") return false;

    if (value.startsWith("data:image/")) {
        return /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value);
    }

    return isRemoteImageUrl(value);
}

function normalizeImageValue(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "string") return value;
    return value.trim();
}

async function uploadImage(file, options = {}) {
    const asset = await uploadImageAsset(file, options);
    return asset.url;
}

async function uploadImageAsset(file, options = {}) {
    const imageSource = file && typeof file === "object"
        ? (Buffer.isBuffer(file.buffer) ? file.buffer : "path" in file ? file.path : file)
        : file;

    if (typeof imageSource === "string" && isRemoteImageUrl(imageSource)) {
        return { url: imageSource, publicId: null };
    }

    if (typeof imageSource === "string" && imageSource.startsWith("data:image/")) {
        if (!cloudinaryConfigured()) return { url: imageSource, publicId: null };
    }

    if (Buffer.isBuffer(imageSource)) {
        if (!cloudinaryConfigured()) {
            return { url: bufferToDataUrl(imageSource, options.mimeType || "image/jpeg"), publicId: null };
        }

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: options.folder || "claimco",
                    resource_type: "image",
                    transformation: options.transformation || [{ quality: "auto", fetch_format: "auto" }],
                },
                (error, response) => {
                    if (error) return reject(error);
                    resolve(response);
                }
            );
            uploadStream.end(imageSource);
        });

        return { url: result.secure_url, publicId: result.public_id || null };
    }

    if (!cloudinaryConfigured()) {
        throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.uploader.upload(imageSource, {
        folder: options.folder || "claimco",
        resource_type: "image",
        transformation: options.transformation || [{ quality: "auto", fetch_format: "auto" }],
    });

    return { url: result.secure_url, publicId: result.public_id || null };
}

async function deleteImage(publicId) {
    if (!publicId || !cloudinaryConfigured()) return;

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}

module.exports = {
    bufferToDataUrl,
    cloudinaryConfigured,
    isRemoteImageUrl,
    isValidImageString,
    normalizeImageValue,
    uploadImage,
    uploadImageAsset,
    deleteImage,
};
