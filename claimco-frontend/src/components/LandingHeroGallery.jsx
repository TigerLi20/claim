import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const photos = [
  {
    src: "/images/landing/clothes-shopping.jpg",
    alt: "Shoppers browsing a colorful rack of secondhand clothing",
    label: "Find your next favorite",
    photographer: "Luba Glazunova",
    source: "https://unsplash.com/photos/a-woman-browsing-colorful-clothes-on-a-rack-2ETxtH6Ti2M",
  },
  {
    src: "/images/landing/vintage-book.jpg",
    alt: "A vintage paperback held above a table of secondhand books",
    label: "Books with another chapter",
    photographer: "Florencia Viadana",
    source: "https://unsplash.com/photos/person-holding-orange-and-black-book-bXUTGOOOr50",
  },
  {
    src: "/images/landing/providence-skyline.jpg",
    alt: "Downtown Providence skyline in warm evening light",
    label: "Made for Providence",
    photographer: "Rafael Rodrigues",
    source: "https://unsplash.com/photos/a-city-skyline-with-tall-buildings-and-a-clock-tower-UlskW1QgwMw",
  },
  {
    src: "/images/landing/vintage-room.jpg",
    alt: "Colorful room with a vintage cabinet, lamp, books, and chair",
    label: "Make a space your own",
    photographer: "Fujiphilm",
    source: "https://unsplash.com/photos/modern-living-room-with-colorful-wall-art-and-vintage-furniture-tpHDuQxF_tE",
  },
  {
    src: "/images/landing/vintage-clothes.jpg",
    alt: "Racks of vintage clothes in a secondhand shop",
    label: "Good style comes around",
    photographer: "Long Chung",
    source: "https://unsplash.com/photos/vintage-clothing-displayed-on-racks-in-a-store-6tih6odK1Do",
  },
  {
    src: "/images/landing/providence-river.jpg",
    alt: "Aerial view of the Providence River and surrounding neighborhoods",
    label: "Close to home",
    photographer: "Nils Huenerfuerst",
    source: "https://unsplash.com/photos/a-city-with-a-river-running-through-it-EKCc5GaYMYk",
  },
  {
    src: "/images/landing/vintage-camera.jpg",
    alt: "A vintage film camera on display",
    label: "Something worth keeping",
    photographer: "Dima DallAcqua",
    source: "https://unsplash.com/photos/a-vintage-camera-is-on-display-oXAaX8VbnuY",
  },
];

export default function LandingHeroGallery() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const next = new Image();
    next.src = photos[(active + 1) % photos.length].src;
  }, [active]);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % photos.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused, active]);

  const photo = photos[active];
  const move = (direction) => setActive((index) => (index + direction + photos.length) % photos.length);

  return (
    <div
      className="landing-hero-gallery"
      aria-roledescription="carousel"
      aria-label="Marketplace and Providence photos"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <img className="landing-hero-photo" src={photo.src} alt={photo.alt} width="1200" height="800" fetchPriority={active === 0 ? "high" : "auto"} />
      <div className="landing-hero-photo-shade" />
      <div className="landing-hero-photo-info">
        <span className="landing-hero-photo-label">{photo.label}</span>
        <a href={photo.source} target="_blank" rel="noopener noreferrer">Photo: {photo.photographer} / Unsplash</a>
      </div>
      <div className="landing-hero-gallery-controls">
        <div className="landing-hero-gallery-dots" aria-label="Choose a photo">
          {photos.map((entry, index) => <button key={entry.src} className={index === active ? "is-active" : ""} type="button" onClick={() => setActive(index)} aria-label={`Show photo ${index + 1} of ${photos.length}`} aria-current={index === active ? "true" : undefined} />)}
        </div>
        <div className="landing-hero-gallery-arrows">
          <button type="button" onClick={() => move(-1)} aria-label="Previous photo"><ChevronLeft size={20} /></button>
          <button type="button" onClick={() => move(1)} aria-label="Next photo"><ChevronRight size={20} /></button>
        </div>
      </div>
    </div>
  );
}
