(function () {
  'use strict';

  function enhanceGallery() {
    const gallery = document.getElementById('group-gallery');
    if (!gallery) return;

    const thumbnails = Array.from(gallery.querySelectorAll('.group-gallery__thumb'));
    const preview = document.getElementById('group-gallery-image');
    const openLink = document.getElementById('group-gallery-open');
    const caption = document.getElementById('group-gallery-caption');
    const count = document.getElementById('group-gallery-count');
    if (!thumbnails.length || !preview || !openLink || !caption || !count) return;

    const dialog = document.getElementById('group-gallery-dialog');
    const largeImage = document.getElementById('group-gallery-large');
    const dialogCaption = document.getElementById('group-gallery-dialog-caption');
    const dialogCount = document.getElementById('group-gallery-dialog-count');
    const canOpenDialog = Boolean(
      dialog && typeof dialog.showModal === 'function' &&
      largeImage && dialogCaption && dialogCount
    );
    const photos = thumbnails.map(function (thumbnail, index) {
      const image = thumbnail.querySelector('img');
      return {
        full: thumbnail.getAttribute('href'),
        preview: thumbnail.getAttribute('data-preview') || thumbnail.getAttribute('href'),
        title: thumbnail.getAttribute('data-title') || 'Group photo ' + (index + 1),
        alt: thumbnail.getAttribute('data-alt') || (image ? image.alt : '')
      };
    });
    let selected = Math.max(0, thumbnails.findIndex(function (thumbnail) {
      return thumbnail.getAttribute('aria-current') === 'true';
    }));

    function updateDialog() {
      const photo = photos[selected];
      largeImage.alt = photo.alt;
      if (largeImage.getAttribute('src') !== photo.full) largeImage.src = photo.full;
      dialogCaption.textContent = photo.title;
      dialogCount.textContent = (selected + 1) + ' / ' + photos.length;
    }

    function selectPhoto(index) {
      selected = (index + photos.length) % photos.length;
      const photo = photos[selected];

      // Keep the full-size link usable even if the preview fails to load.
      openLink.href = photo.full;
      openLink.setAttribute('aria-label', 'View full-size photo: ' + photo.title);
      preview.alt = photo.alt;
      if (preview.getAttribute('src') !== photo.preview) preview.src = photo.preview;
      caption.textContent = photo.title;
      count.textContent = (selected + 1) + ' / ' + photos.length;
      thumbnails.forEach(function (thumbnail, thumbnailIndex) {
        if (thumbnailIndex === selected) {
          thumbnail.setAttribute('aria-current', 'true');
        } else {
          thumbnail.removeAttribute('aria-current');
        }
      });

      if (canOpenDialog && dialog.open) updateDialog();
    }

    function isPlainClick(event) {
      return !event.defaultPrevented && !(event.button > 0) &&
        !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
    }

    thumbnails.forEach(function (thumbnail, index) {
      thumbnail.addEventListener('click', function (event) {
        if (!isPlainClick(event)) return;
        event.preventDefault();
        selectPhoto(index);
      });
    });

    const stepButtons = new Set(Array.from(gallery.querySelectorAll('[data-gallery-step]')));
    if (dialog) {
      dialog.querySelectorAll('[data-gallery-step]').forEach(function (button) {
        stepButtons.add(button);
      });
    }
    stepButtons.forEach(function (button) {
      button.addEventListener('click', function (event) {
        const step = Number(button.getAttribute('data-gallery-step'));
        if (step !== -1 && step !== 1) return;
        event.preventDefault();
        selectPhoto(selected + step);
      });
      button.disabled = photos.length < 2;
    });

    function handleNavigation(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      let next;
      switch (event.key) {
        case 'ArrowLeft': next = selected - 1; break;
        case 'ArrowRight': next = selected + 1; break;
        case 'Home': next = 0; break;
        case 'End': next = photos.length - 1; break;
        default: return;
      }
      event.preventDefault();
      selectPhoto(next);
    }

    // Navigation is scoped to focused gallery elements, never the whole page.
    gallery.addEventListener('keydown', function (event) {
      if (dialog && dialog.contains(event.target)) return;
      handleNavigation(event);
    });

    if (canOpenDialog) {
      openLink.setAttribute('aria-haspopup', 'dialog');
      openLink.addEventListener('click', function (event) {
        if (!isPlainClick(event)) return;
        event.preventDefault();
        updateDialog();
        if (!dialog.open) dialog.showModal();
      });

      dialog.addEventListener('keydown', function (event) {
        if (dialog.open) handleNavigation(event);
        // Escape uses the native dialog cancel behavior and focus management.
      });
      dialog.querySelectorAll('[data-gallery-close]').forEach(function (button) {
        button.addEventListener('click', function (event) {
          event.preventDefault();
          if (dialog.open) dialog.close();
        });
      });
      dialog.addEventListener('click', function (event) {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) {
          dialog.close();
        }
      });
      dialog.addEventListener('close', function () {
        openLink.focus({ preventScroll: true });
      });
    }

    selectPhoto(selected);
    gallery.classList.add('is-enhanced');
    gallery.querySelectorAll('.group-gallery__controls').forEach(function (controls) {
      controls.hidden = false;
    });
    if (canOpenDialog) {
      dialog.querySelectorAll('.group-gallery__controls').forEach(function (controls) {
        controls.hidden = false;
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceGallery, { once: true });
  } else {
    enhanceGallery();
  }
}());
