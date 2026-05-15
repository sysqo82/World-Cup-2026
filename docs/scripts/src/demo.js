const lightbox = document.getElementById('demo-lightbox');
const lightboxImage = document.getElementById('demo-lightbox-image');
const lightboxCaption = document.getElementById('demo-lightbox-caption');
const closeButton = document.getElementById('demo-lightbox-close');

function openLightbox(imageSrc, imageAlt, caption) {
    lightboxImage.src = imageSrc;
    lightboxImage.alt = imageAlt || caption || 'Expanded demo image';
    lightboxCaption.textContent = caption || '';
    lightbox.classList.remove('hidden');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('demo-lightbox-open');
}

function closeLightbox() {
    lightbox.classList.add('hidden');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImage.src = '';
    lightboxImage.alt = '';
    lightboxCaption.textContent = '';
    document.body.classList.remove('demo-lightbox-open');
}

document.querySelectorAll('.demo-thumbnail').forEach((thumbnailButton) => {
    thumbnailButton.addEventListener('click', () => {
        const image = thumbnailButton.querySelector('img');
        openLightbox(
            thumbnailButton.dataset.full || image.src,
            image.alt,
            thumbnailButton.dataset.caption || thumbnailButton.querySelector('span')?.textContent || ''
        );
    });
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
