if (!customElements.get('gallery-zoom-open')) {
  class GalleryZoomOpen extends HTMLElement {
    connectedCallback() {
      this.addEventListener('click', this.handleClick.bind(this));
    }

    /**
     * Handle a click event.
     * @param {object} evt - Event object.
     */
    handleClick(evt) {
      const mediaGallery = this.closest('media-gallery');
      const zoomDevice = mediaGallery.dataset.zoomEnabled;

      if (
        zoomDevice.length === 0 ||
        (zoomDevice === 'mobile' && !theme.mediaMatches.md) ||
        (zoomDevice === 'desktop' && theme.mediaMatches.md)
      ) {
        // Add to document on first open
        if (!mediaGallery.galleryModal.parentElement) {
          document.body.appendChild(mediaGallery.galleryModal);
        }

        mediaGallery.galleryModal.open(evt.currentTarget);
        const zoom = mediaGallery.galleryModal.querySelector('gallery-zoom');
        zoom.init(evt.currentTarget.parentElement.dataset.mediaId);
        zoom.focus();

        evt.preventDefault();
      }
    }
  }

  window.customElements.define('gallery-zoom-open', GalleryZoomOpen);
}

if (!customElements.get('gallery-zoom')) {
  class GalleryZoom extends HTMLElement {
    connectedCallback() {
      if (!this.initialised) {
        this.initialised = true;

        // ui
        this.classList.add('gallery-zoom--pre-reveal');
        this.zoomContainer = this.querySelector('.gallery-zoom__zoom-container');
        this.thumbContainer = this.querySelector('.gallery-zoom__thumbs');
        this.controlsContainer = this.querySelector('.gallery-zoom__controls');
        this.previousBtn = this.querySelector('.gallery-zoom__prev');
        this.nextBtn = this.querySelector('.gallery-zoom__next');
        this.counterCurrent = this.querySelector('.media-ctrl__current-item');
        this.counterTotal = this.querySelector('.media-ctrl__total-items');
        this.mediaGallery = document.querySelector('.cc-main-product media-gallery');
        this.thumbSlider = this.querySelector('.gallery-zoom__thumb-slider');

        // consts
        this.wheelZoomMultiplier = -0.001;
        this.pinchZoomMultiplier = 0.003;
        this.touchPanModifier = 1.0;
        this.isZoomedIn = false;

        // vars
        this.currentZoomImage = null;
        this.currentTransform = {
          panX: 0,
          panY: 0,
          zoom: 1
        };
        this.pinchTracking = {
          isTracking: false,
          lastPinchDistance: 0
        };
        this.touchTracking = {
          isTracking: false,
          lastTouchX: 0,
          lastTouchY: 0
        };
        this.isDragging = false;
        this.dragThreshold = 5;
        this.initialMouseX = 0;
        this.initialMouseY = 0;
        this.dragged = false; // Flag to track if a drag occurred

        // events
        this.querySelectorAll('.gallery-zoom__thumb').forEach((el) => {
          el.addEventListener('click', this.onThumbClick.bind(this));
        });
        this.addEventListener('touchend', this.stopTrackingTouch.bind(this));
        this.addEventListener('touchmove', this.trackInputMovement.bind(this));
        this.addEventListener('mousemove', this.trackInputMovement.bind(this));
        this.addEventListener('wheel', this.trackWheel.bind(this));
        // Prevent pan while swiping thumbnails
        this.thumbContainer.addEventListener('touchmove', (evt) => evt.stopPropagation());
        this.previousBtn.addEventListener('click', this.selectPreviousThumb.bind(this));
        this.nextBtn.addEventListener('click', this.selectNextThumb.bind(this));
        this.zoomContainer.addEventListener('click', this.onZoomContainerClick.bind(this));
        new ResizeObserver(() => this.setInitialImagePosition()).observe(this);

        // Add event listeners for mouse events
        this.zoomContainer.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.zoomContainer.addEventListener('mousemove', this.trackInputMovement.bind(this));
        this.zoomContainer.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.zoomContainer.addEventListener('mouseleave', this.onMouseUp.bind(this));
        this.zoomContainer.addEventListener('dragstart', (evt) => evt.preventDefault());
      }

      document.documentElement.classList.add('gallery-zoom-open');
      this.addEventListener('keyup', this.handleKeyup.bind(this));
      setTimeout(() => this.classList.remove('gallery-zoom--pre-reveal'), 10);
    }

    // Remove the document class on disconnect.
    disconnectedCallback() {
      document.documentElement.classList.remove('gallery-zoom-open');
    }

    /**
     * Helper for creating a DOM element.
     */
    static createEl(type, className, appendTo, innerHTML) {
      const el = document.createElement(type);
      el.className = className;
      if (appendTo) {
        appendTo.insertAdjacentElement('beforeend', el);
      }
      if (innerHTML) {
        el.innerHTML = innerHTML;
      }
      return el;
    }

    init(currentMediaId) {
      if (this.mediaGallery.dataset.mediaGroupingEnabled) {
        let visibleThumbCount = 0;
        Array.from(this.thumbContainer.children).forEach((thumb) => {
          const mediaGalleryImage = this.mediaGallery.querySelector(
            `.media-viewer__item[data-media-id="${thumb.dataset.mediaId}"]`
          );
          thumb.hidden = mediaGalleryImage?.style.display === 'none';
          if (!thumb.hidden) visibleThumbCount += 1;
        });
        if (this.counterTotal) this.counterTotal.textContent = visibleThumbCount;
      }

      this.selectThumb(
        [...this.thumbContainer.children].find((el) => el.dataset.mediaId === currentMediaId) ||
          this.thumbContainer.firstElementChild
      );
    }

    panZoomImageFromCoordinate(inputX, inputY) {
      const midX = this.clientWidth / 2;
      const midY = this.clientHeight / 2;

      const offsetFromCentreX = inputX - midX;
      const offsetFromCentreY = inputY - midY;

      const maxPanX = (this.currentZoomImage.naturalWidth * this.currentTransform.zoom - this.clientWidth) / 2.0;
      const maxPanY = (this.currentZoomImage.naturalHeight * this.currentTransform.zoom - this.clientHeight) / 2.0;

      let finalOffsetX = 0;
      let finalOffsetY = 0;

      if (maxPanX > 0) {
        const offsetMultiplierX = maxPanX / midX;
        finalOffsetX = Math.round(-offsetFromCentreX * offsetMultiplierX);
      }
      if (maxPanY > 0) {
        const offsetMultiplierY = maxPanY / midY;
        finalOffsetY = Math.round(-offsetFromCentreY * offsetMultiplierY);
      }

      this.currentTransform.panX = finalOffsetX;
      this.currentTransform.panY = finalOffsetY;
      this.alterCurrentPanBy(0, 0);
      this.updateImagePosition();
    }

    alterCurrentPanBy(x, y) {
      this.currentTransform.panX += x;
      let panXMax = (this.currentZoomImage.naturalWidth * this.currentTransform.zoom - this.clientWidth) / 2.0;
      panXMax = Math.max(panXMax, 0);
      this.currentTransform.panX = Math.min(this.currentTransform.panX, panXMax);
      this.currentTransform.panX = Math.max(this.currentTransform.panX, -panXMax);

      this.currentTransform.panY += y;
      let panYMax = (this.currentZoomImage.naturalHeight * this.currentTransform.zoom - this.clientHeight) / 2.0;
      panYMax = Math.max(panYMax, 0);
      this.currentTransform.panY = Math.min(this.currentTransform.panY, panYMax);
      this.currentTransform.panY = Math.max(this.currentTransform.panY, -panYMax);
      this.updateImagePosition();
    }

    setInitialImagePosition() {
      this.currentZoomImage.style.top = `${this.clientHeight / 2 - this.currentZoomImage.clientHeight / 2}px`;
      this.currentZoomImage.style.left = `${this.clientWidth / 2 - this.currentZoomImage.clientWidth / 2}px`;
      this.currentTransform.zoom = 0.4;
      this.isZoomedIn = false;
      this.updateImagePosition();
    }

    updateImagePosition() {
      requestAnimationFrame(() => {
        this.currentZoomImage.style.transform = `translate3d(${this.currentTransform.panX}px, ${this.currentTransform.panY}px, 0) scale(${this.currentTransform.zoom})`;
      });
    }

    selectThumb(thumb) {
      let activeThumb;

      [...thumb.parentElement.children].forEach((el) => {
        if (el === thumb) {
          activeThumb = thumb;
          el.classList.add('gallery-zoom__thumb--active');
        } else {
          el.classList.remove('gallery-zoom__thumb--active');
        }
      });

      const visibleThumbs = Array.from(activeThumb.parentElement.children).filter((child) => !child.hidden);
      const activeThumbIndex = visibleThumbs.indexOf(activeThumb);
      if (this.counterCurrent) this.counterCurrent.textContent = activeThumbIndex + 1;

      // Scroll to thumbnail if necessary
      this.scrollToThumb(activeThumb);

      this.previousBtn.disabled = activeThumbIndex === 0;
      this.nextBtn.disabled = activeThumbIndex === (visibleThumbs.length - 1);

      // Replace zoom image
      this.zoomContainer.classList.add('gallery-zoom__zoom-container--loading');
      this.currentZoomImage = GalleryZoom.createEl('img', 'gallery-zoom__zoom-image');
      this.currentZoomImage.alt = thumb.querySelector('.gallery-zoom__thumb-img')?.alt;
      this.currentZoomImage.style.visibility = 'hidden';
      this.currentZoomImage.draggable = false;
      this.currentZoomImage.onload = () => {
        this.zoomContainer.classList.remove('gallery-zoom__zoom-container--loading');
        this.currentZoomImage.style.visibility = '';
        this.setInitialImagePosition();
      };
      this.currentZoomImage.src = thumb.dataset.zoomUrl;
      this.zoomContainer.replaceChildren(this.currentZoomImage);
    }

    scrollToThumb(thumb) {
      const thumbSliderRect = this.thumbSlider.getBoundingClientRect();
      const thumbRect = thumb.getBoundingClientRect();

      const thumbLeft = thumbRect.left - thumbSliderRect.left;
      const thumbRight = thumbRect.right - thumbSliderRect.right;

      if (thumbLeft < 0) {
        this.thumbSlider.scrollLeft += thumbLeft - (this.thumbSlider.clientWidth - thumbRect.width);
      } else if (thumbRight > 0) {
        this.thumbSlider.scrollLeft += thumbRight + (this.thumbSlider.clientWidth - thumbRect.width);
      }
    }

    selectPreviousThumb(evt) {
      if (evt) evt.preventDefault();
      if (this.thumbContainer.childElementCount < 2) return;

      let previous = this.thumbContainer.querySelector('.gallery-zoom__thumb--active').previousElementSibling;
      while (!previous || !previous.offsetParent) {
        if (!previous) {
          previous = this.thumbContainer.lastElementChild;
        } else {
          previous = previous.previousElementSibling;
        }
      }
      this.selectThumb(previous);
    }

    selectNextThumb(evt) {
      if (evt) evt.preventDefault();
      if (this.thumbContainer.childElementCount < 2) return;

      let next = this.thumbContainer.querySelector('.gallery-zoom__thumb--active').nextElementSibling;
      while (!next || !next.offsetParent) {
        if (!next) {
          next = this.thumbContainer.firstElementChild;
        } else {
          next = next.nextElementSibling;
        }
      }
      this.selectThumb(next);
    }

    trackInputMovement(evt) {
      if (!this.isZoomedIn) return;
      evt.preventDefault();

      if (evt.buttons === 1) {
        const deltaX = evt.clientX - this.initialMouseX;
        const deltaY = evt.clientY - this.initialMouseY;

        // Check if movement exceeds threshold
        if (!this.isDragging && (Math.abs(deltaX) > this.dragThreshold || Math.abs(deltaY) > this.dragThreshold)) {
          this.isDragging = true;
          this.dragged = true;
        }

        if (this.isDragging) {
          this.alterCurrentPanBy(deltaX, deltaY);
          this.initialMouseX = evt.clientX;
          this.initialMouseY = evt.clientY;
        }
      } else {
        this.isDragging = false;
      }
    }

    trackWheel(evt) {
      if (!this.isZoomedIn) return;
      evt.preventDefault();
      if (evt.deltaY !== 0) {
        this.alterCurrentTransformZoomBy(evt.deltaY * this.wheelZoomMultiplier);
      }
    }

    onThumbClick(evt) {
      evt.preventDefault();
      this.selectThumb(evt.currentTarget);
    }

    onZoomContainerClick(evt) {
      evt.preventDefault();

      // If a drag occurred, ignore the click to prevent zoom toggle
      if (this.dragged) {
        this.dragged = false;
        return;
      }

      if (!this.isDragging) {
        if (this.isZoomedIn) {
          this.setCurrentTransform(0, 0, 0.4);
          this.isZoomedIn = false;
        } else {
          const fullWidthScale = this.clientWidth / this.currentZoomImage.naturalWidth;
          this.setCurrentTransform(0, 0, fullWidthScale);
          this.panZoomImageFromCoordinate(evt.clientX, evt.clientY);
          this.isZoomedIn = true;
        }
      }
      this.isDragging = false;
    }

    handleKeyup(evt) {
      switch (evt.key) {
        case 'ArrowLeft':
          evt.preventDefault();
          this.selectPreviousThumb();
          break;
        case 'ArrowRight':
          evt.preventDefault();
          this.selectNextThumb();
          break;
      }
    }

    alterCurrentTransformZoomBy(delta) {
      this.currentTransform.zoom += delta;
      // Ensure zoom doesn't go below 0.4
      this.currentTransform.zoom = Math.max(this.currentTransform.zoom, 0.4);
      // Limit zoom to full-width scale
      const fullWidthScale = this.clientWidth / this.currentZoomImage.naturalWidth;
      this.currentTransform.zoom = Math.min(this.currentTransform.zoom, fullWidthScale);
      // Reassess pan bounds
      this.alterCurrentPanBy(0, 0);
      this.updateImagePosition();
    }

    setCurrentTransform(panX, panY, zoom) {
      this.currentTransform.panX = panX;
      this.currentTransform.panY = panY;
      this.currentTransform.zoom = zoom;
      this.updateImagePosition();
    }

    stopTrackingTouch() {
      this.pinchTracking.isTracking = false;
      this.touchTracking.isTracking = false;
      this.isDragging = false;
    }

    onMouseDown(evt) {
      if (this.isZoomedIn) {
        this.initialMouseX = evt.clientX;
        this.initialMouseY = evt.clientY;
        this.isDragging = false;
        this.dragged = false; // Reset dragged flag
        evt.preventDefault();
      }
    }

    onMouseUp(evt) {
      if (this.isDragging) {
        this.isDragging = false;
      }
    }
  }

  window.customElements.define('gallery-zoom', GalleryZoom);
}
