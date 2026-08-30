export default function ImageGallery({ images = [], preview = false }) {
    if (!images.length) return null;
    return (
        <div className={preview ? "image-preview" : "image-gallery"}>
            {(preview ? images.slice(0, 1) : images).map((image, index) => (
                <img key={`${image.slice(-20)}-${index}`} src={image} alt={`Task or tutoring image ${index + 1}`} />
            ))}
        </div>
    );
}
