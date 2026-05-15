const lightbox = document.getElementById('demo-lightbox');
const lightboxImage = document.getElementById('demo-lightbox-image');
const lightboxCaption = document.getElementById('demo-lightbox-caption');
const closeButton = document.getElementById('demo-lightbox-close');
let lastTriggerButton = null;

function openLightbox(imageSrc, imageAlt, caption) {
    lightboxImage.classList.remove('demo-lightbox-image-error');
    lightboxImage.src = imageSrc;
    lightboxImage.alt = imageAlt || caption || 'Expanded demo image';
    lightboxCaption.textContent = caption || '';
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
        lastTriggerButton = thumbnailButton;
        const image = thumbnailButton.querySelector('img');
        const resolvedFullImage = thumbnailButton.dataset.full
            ? new URL(thumbnailButton.dataset.full, window.location.href).href
            : image.currentSrc || image.src;

        openLightbox(
            resolvedFullImage || image.currentSrc || image.src,
            image.alt,
            thumbnailButton.dataset.caption || thumbnailButton.querySelector('span')?.textContent || ''
        );
    });
});

lightboxImage.addEventListener('error', () => {
    lightboxImage.classList.add('demo-lightbox-image-error');
    lightboxCaption.textContent = 'The enlarged image could not be loaded. The thumbnail is still available on the page below.';
});

closeButton.addEventListener('click', closeLightbox);

lightbox.addEventListener('click', (event) => {
    if (event.target.dataset.closeLightbox === 'true') {
        closeLightbox();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !lightbox.classList.contains('hidden')) {
        closeLightbox();
    }
});
