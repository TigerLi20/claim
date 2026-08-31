const { isValidImageString, uploadImageAsset, deleteImage } = require("./cloudinary");

const MAX_IMAGES = 3;
const MAX_IMAGE_LENGTH = 600 * 1024;

async function prepareImageAssets(value, { folder, existingImages = [], existingPublicIds = [] } = {}) {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length > MAX_IMAGES) {
    throw new Error("Add up to 3 valid images, each no larger than 600 KB after compression.");
  }

  const existingIdsByUrl = new Map();
  existingImages.forEach((image, index) => {
    const publicId = existingPublicIds[index];
    if (typeof image === "string" && publicId) existingIdsByUrl.set(image, publicId);
  });

  const assets = [];
  try {
    for (const image of value) {
      if (typeof image !== "string" || image.length > MAX_IMAGE_LENGTH || !isValidImageString(image)) {
        throw new Error("Add up to 3 valid images, each no larger than 600 KB after compression.");
      }
      const asset = await uploadImageAsset(image, { folder });
      assets.push({
        url: asset.url,
        publicId: asset.publicId || existingIdsByUrl.get(image) || null,
      });
    }
  } catch (error) {
    await deleteImageAssets(assets.map((asset) => asset.publicId));
    throw error;
  }

  return assets;
}

async function deleteImageAssets(publicIds) {
  const uniqueIds = [...new Set((publicIds || []).filter(Boolean))];
  await Promise.all(uniqueIds.map(async (publicId) => {
    try {
      await deleteImage(publicId);
    } catch (error) {
      console.error(`Cloudinary cleanup failed for ${publicId}:`, error);
    }
  }));
}

module.exports = { prepareImageAssets, deleteImageAssets };
