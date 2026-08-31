import { useRef } from "react";

const MAX_IMAGES = 3;
const MAX_OUTPUT_BYTES = 600 * 1024;
const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.7;

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read that image."));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error("Could not process that image."));
            image.onload = () => {
                const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(image.width * scale);
                canvas.height = Math.round(image.height * scale);
                canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
                const result = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
                if (result.length > MAX_OUTPUT_BYTES) reject(new Error("That image is still too large after compression. Try a smaller image."));
                else resolve(result);
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

export default function ImagePicker({ images, onChange }) {
    const inputRef = useRef(null);

    async function handleFiles(event) {
        const files = [...(event.target.files || [])];
        event.target.value = "";
        if (!files.length) return;
        if (images.length + files.length > MAX_IMAGES) {
            onChange(images, "You can add up to 3 pictures.");
            return;
        }
        try {
            const compressed = await Promise.all(files.map(compressImage));
            onChange([...images, ...compressed], "");
        } catch (error) {
            onChange(images, error.message);
        }
    }

    return (
        <div className="image-picker">
            <div className="image-picker-grid">
                {images.map((image, index) => (
                    <div className="image-picker-item" key={`${image.slice(-20)}-${index}`}>
                        <img src={image} alt={`Selected ${index + 1}`} />
                        <button type="button" onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index), "")}>Remove</button>
                    </div>
                ))}
            </div>
            {images.length < MAX_IMAGES && (
                <button className="image-picker-add" type="button" onClick={() => inputRef.current?.click()}>
                    Add pictures ({images.length}/3)
                </button>
            )}
            <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={handleFiles} />
        </div>
    );
}
