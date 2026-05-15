const lightbox = document.getElementById('demo-lightbox');
const lightboxImage = document.getElementById('demo-lightbox-image');
const lightboxCaption = document.getElementById('demo-lightbox-caption');
const closeButton = document.getElementById('demo-lightbox-close');
const prevButton = document.getElementById('demo-lightbox-prev');
const nextButton = document.getElementById('demo-lightbox-next');
let lastTriggerButton = null;
let currentGalleryIndex = -1;
let currentImageIndex = -1;
let touchStartX = 0;
let touchStartY = 0;

const galleries = Array.from(document.querySelectorAll('.demo-gallery')).map((gallery, galleryIndex) => {
    const items = Array.from(gallery.querySelectorAll('.demo-thumbnail'));

    items.forEach((thumbnailButton, imageIndex) => {
        thumbnailButton.dataset.galleryIndex = String(galleryIndex);
        thumbnailButton.dataset.imageIndex = String(imageIndex);
    });

    return items;
});

function getThumbnail(galleryIndex, imageIndex) {
    return galleries[galleryIndex]?.[imageIndex] || null;
}

function updateLightboxNav() {
    const galleryItems = galleries[currentGalleryIndex] || [];
    prevButton.disabled = currentImageIndex <= 0;
    nextButton.disabled = currentImageIndex >= galleryItems.length - 1;
}

function showLightboxImage(galleryIndex, imageIndex) {
    const thumbnailButton = getThumbnail(galleryIndex, imageIndex);
    if (!thumbnailButton) return;

    currentGalleryIndex = galleryIndex;
    currentImageIndex = imageIndex;
    lastTriggerButton = thumbnailButton;

    const image = thumbnailButton.querySelector('img');
    const resolvedFullImage = thumbnailButton.dataset.full
        ? new URL(thumbnailButton.dataset.full, window.location.href).href
        : image.currentSrc || image.src;

    lightboxImage.classList.remove('demo-lightbox-image-error');
    lightboxImage.src = resolvedFullImage || image.currentSrc || image.src;
    lightboxImage.alt = image.alt || thumbnailButton.dataset.caption || 'Expanded demo image';
    lightboxCaption.textContent = thumbnailButton.dataset.caption || thumbnailButton.querySelector('span')?.textContent || '';
    updateLightboxNav();
}

function openLightbox(galleryIndex, imageIndex) {
    showLightboxImage(galleryIndex, imageIndex);
    lightbox.classList.remove('hidden');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('demo-lightbox-open');
    closeButton.focus();
}

function closeLightbox() {
    closeButton.blur();
    lightbox.classList.add('hidden');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImage.src = '';
    lightboxImage.alt = '';
    lightboxCaption.textContent = '';
    document.body.classList.remove('demo-lightbox-open');

    if (lastTriggerButton) {
        lastTriggerButton.focus();
    }
}

document.querySelectorAll('.demo-thumbnail').forEach((thumbnailButton) => {
    thumbnailButton.addEventListener('click', () => {
        openLightbox(
            Number(thumbnailButton.dataset.galleryIndex),
            Number(thumbnailButton.dataset.imageIndex)
        );
    });
});

lightboxImage.addEventListener('error', () => {
    lightboxImage.classList.add('demo-lightbox-image-error');
    lightboxCaption.textContent = 'The enlarged image could not be loaded. The thumbnail is still available on the page below.';
});

prevButton.addEventListener('click', () => {
    if (currentImageIndex > 0) {
        showLightboxImage(currentGalleryIndex, currentImageIndex - 1);
    }
});

nextButton.addEventListener('click', () => {
    if (currentImageIndex < (galleries[currentGalleryIndex]?.length || 0) - 1) {
        showLightboxImage(currentGalleryIndex, currentImageIndex + 1);
    }
});

lightboxImage.addEventListener('touchstart', (event) => {
    const firstTouch = event.changedTouches[0];
    touchStartX = firstTouch.clientX;
    touchStartY = firstTouch.clientY;
}, { passive: true });

lightboxImage.addEventListener('touchend', (event) => {
    const firstTouch = event.changedTouches[0];
    const deltaX = firstTouch.clientX - touchStartX;
    const deltaY = firstTouch.clientY - touchStartY;

    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return;
    }

    if (deltaX < 0 && !nextButton.disabled) {
        showLightboxImage(currentGalleryIndex, currentImageIndex + 1);
    } else if (deltaX > 0 && !prevButton.disabled) {
        showLightboxImage(currentGalleryIndex, currentImageIndex - 1);
    }
}, { passive: true });

closeButton.addEventListener('click', closeLightbox);

lightbox.addEventListener('click', (event) => {
    if (event.target.dataset.closeLightbox === 'true') {
        closeLightbox();
    }
});

document.addEventListener('keydown', (event) => {
    if (lightbox.classList.contains('hidden')) {
        return;
    }

    if (event.key === 'Escape') {
        closeLightbox();
    } else if (event.key === 'ArrowLeft' && !prevButton.disabled) {
        showLightboxImage(currentGalleryIndex, currentImageIndex - 1);
    } else if (event.key === 'ArrowRight' && !nextButton.disabled) {
        showLightboxImage(currentGalleryIndex, currentImageIndex + 1);
    }
});
