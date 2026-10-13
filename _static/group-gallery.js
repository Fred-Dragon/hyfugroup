(function () {
  'use strict';

  function enhanceGallery() {
    const gallery = document.getElementById('group-gallery');
    if (!gallery) return;

    const thumbnails = Array.from(gallery.querySelectorAll('.group-gallery__thumb'));
    const yearGroups = Array.from(gallery.querySelectorAll('.group-gallery__year-group'));
    const yearButtons = Array.from(gallery.querySelectorAll('[data-gallery-year]'));
    const preview = document.getElementById('group-gallery-image');
    const openLink = document.getElementById('group-gallery-open');
    const count = document.getElementById('group-gallery-count');
    if (!thumbnails.length || !preview || !openLink || !count) return;

    const dialog = document.getElementById('group-gallery-dialog');
    const largeImage = document.getElementById('group-gallery-large');
    const dialogYear = document.getElementById('group-gallery-dialog-year');
    const dialogCount = document.getElementById('group-gallery-dialog-count');
    const canOpenDialog = Boolean(
      dialog && typeof dialog.showModal === 'function' &&
      largeImage && dialogYear && dialogCount
    );
    const photosByYear = new Map();
    thumbnails.forEach(function (thumbnail) {
      const image = thumbnail.querySelector('img');
      const group = thumbnail.closest('.group-gallery__year-group');
      const year = thumbnail.getAttribute('data-year') || (group && group.getAttribute('data-year'));
      if (!year) return;
      if (!photosByYear.has(year)) photosByYear.set(year, []);
      photosByYear.get(year).push({
        thumbnail: thumbnail,
        full: thumbnail.getAttribute('href'),
        preview: thumbnail.getAttribute('data-preview') || thumbnail.getAttribute('href'),
        alt: thumbnail.getAttribute('data-alt') || (image ? image.alt : '')
      });
    });
    if (!photosByYear.size) return;

    const initialThumbnail = thumbnails.find(function (thumbnail) {
      return thumbnail.getAttribute('aria-current') === 'true';
    });
    let selectedYear = Array.from(photosByYear.keys()).find(function (year) {
      return photosByYear.get(year).some(function (photo) {
        return photo.thumbnail === initialThumbnail;
      });
    }) || photosByYear.keys().next().value;
    let selected = Math.max(0, photosByYear.get(selectedYear).findIndex(function (photo) {
      return photo.thumbnail === initialThumbnail;
    }));
    const stepButtons = new Set(Array.from(gallery.querySelectorAll('[data-gallery-step]')));
    if (dialog) {
      dialog.querySelectorAll('[data-gallery-step]').forEach(function (button) {
        stepButtons.add(button);
      });
    }

    function updateDialog() {
      const photos = photosByYear.get(selectedYear);
      const photo = photos[selected];
      largeImage.alt = photo.alt;
      if (largeImage.getAttribute('src') !== photo.full) largeImage.src = photo.full;
      dialog.setAttribute('aria-label', selectedYear + ' group photos');
      dialogYear.textContent = selectedYear;
      dialogCount.textContent = (selected + 1) + ' / ' + photos.length;
    }

    function selectPhoto(index) {
      const photos = photosByYear.get(selectedYear);
      selected = (index + photos.length) % photos.length;
      const photo = photos[selected];

      // Keep the full-size link usable even if the preview fails to load.
      openLink.href = photo.full;
      openLink.setAttribute('aria-label', 'View full-size photo: ' + selectedYear + ', ' +
        (selected + 1) + ' of ' + photos.length);
      preview.alt = photo.alt;
      if (preview.getAttribute('src') !== photo.preview) preview.src = photo.preview;
      count.textContent = (selected + 1) + ' / ' + photos.length;
      thumbnails.forEach(function (thumbnail) {
        if (thumbnail === photo.thumbnail) {
          thumbnail.setAttribute('aria-current', 'true');
        } else {
          thumbnail.removeAttribute('aria-current');
        }
      });
      stepButtons.forEach(function (button) {
        button.disabled = photos.length < 2;
      });

      if (canOpenDialog && dialog.open) updateDialog();
    }

    function selectYear(year, index) {
      if (!photosByYear.has(year)) return;
      selectedYear = year;
      yearGroups.forEach(function (group) {
        group.hidden = group.getAttribute('data-year') !== selectedYear;
      });
      yearButtons.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.getAttribute('data-gallery-year') === selectedYear));
      });
      selectPhoto(index || 0);
    }

    function isPlainClick(event) {
      return !event.defaultPrevented && !(event.button > 0) &&
        !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
    }

    photosByYear.forEach(function (photos, year) {
      photos.forEach(function (photo, index) {
        photo.thumbnail.setAttribute('aria-label', 'View ' + year + ' photo ' +
          (index + 1) + ' of ' + photos.length);
        photo.thumbnail.addEventListener('click', function (event) {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          selectYear(year, index);
        });
      });
    });

    yearButtons.forEach(function (button, index) {
      button.addEventListener('click', function () {
        selectYear(button.getAttribute('data-gallery-year'));
      });
      button.addEventListener('keydown', function (event) {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
        let next;
        switch (event.key) {
          case 'ArrowLeft': next = (index - 1 + yearButtons.length) % yearButtons.length; break;
          case 'ArrowRight': next = (index + 1) % yearButtons.length; break;
          case 'Home': next = 0; break;
          case 'End': next = yearButtons.length - 1; break;
          default: return;
        }
        event.preventDefault();
        selectYear(yearButtons[next].getAttribute('data-gallery-year'));
        yearButtons[next].focus({ preventScroll: true });
      });
    });

    stepButtons.forEach(function (button) {
      button.addEventListener('click', function (event) {
        const step = Number(button.getAttribute('data-gallery-step'));
        if (step !== -1 && step !== 1) return;
        event.preventDefault();
        selectPhoto(selected + step);
      });
    });

    function handleNavigation(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
          target.closest('.group-gallery__years')) return;

      let next;
      switch (event.key) {
        case 'ArrowLeft': next = selected - 1; break;
        case 'ArrowRight': next = selected + 1; break;
        case 'Home': next = 0; break;
        case 'End': next = photosByYear.get(selectedYear).length - 1; break;
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

    selectYear(selectedYear, selected);
    gallery.classList.add('is-enhanced');
    gallery.querySelectorAll('.group-gallery__controls, .group-gallery__years').forEach(function (controls) {
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
