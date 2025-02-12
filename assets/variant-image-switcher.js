class VariantImageSwitcher {
    constructor() {
      this.buttons = document.querySelectorAll('.variant-size-selector');
      this.init();
    }
  
    init() {
      this.buttons.forEach(button => {
        button.addEventListener('click', (e) => this.handleVariantSelect(e));
      });
    }
  
    async handleVariantSelect(e) {
      const button = e.target;
      const sizeOption = button.dataset.size;
      
      // If clicking the already active button, do nothing
      if (button.classList.contains('!tw-opacity-100')) return;
      
      // Remove active state from all buttons
      this.buttons.forEach(btn => btn.classList.remove('!tw-opacity-100'));
      this.buttons.forEach(btn => btn.classList.add('tw-opacity-50'));
      button.classList.add('!tw-opacity-100');

      // Get all product cards in the collection
      const productCards = document.querySelectorAll('.card--product');
      
      productCards.forEach(card => {
        const productImage = card.querySelector('.card__main-image');
        if (!productImage) return;

        let newSrc;
        // Set image based on size option
        if (sizeOption === 'regular') {
          newSrc = card.dataset.smallImage;
        } else if (sizeOption === 'large') {
          newSrc = card.dataset.largeImage;
        } else if (sizeOption === 'off') {
          newSrc = card.dataset.defaultImage;
        }

        if (newSrc) {
          // Ensure URL is absolute
          if (newSrc.startsWith('//')) {
            newSrc = 'https:' + newSrc;
          }

          // Update both src and srcset
          productImage.src = newSrc;
          
          // Generate new srcset based on the new image URL
          const baseUrl = newSrc.split('?')[0];
          const version = newSrc.split('?v=')[1];
          const srcset = [320, 460, 600, 700, 800, 900]
            .map(width => `${baseUrl}?v=${version}&width=${width} ${width}w`)
            .join(', ');
          
          productImage.srcset = srcset;
        }
      });
    }
  }
  
  // Initialize the variant switcher
  customElements.define('variant-image-switcher', VariantImageSwitcher);
  new VariantImageSwitcher();