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
      
      // Remove active state from all buttons
      this.buttons.forEach(btn => btn.classList.remove('!tw-opacity-100'));
      this.buttons.forEach(btn => btn.classList.add('tw-opacity-50'));
      button.classList.add('!tw-opacity-100');

      // Get all product cards in the collection
      const productCards = document.querySelectorAll('.card--product');
      
      productCards.forEach(card => {
        const productImage = card.querySelector('.card__main-image');
        if (!productImage) return;

        // Set image based on size option
        if (sizeOption === 'regular') {
          productImage.src = card.dataset.smallImage;
        } else if (sizeOption === 'large') {
          productImage.src = card.dataset.largeImage;
        } else if (sizeOption === 'off') {
          productImage.src = card.dataset.defaultImage;
        }
      });
    }
  }
  
  // Initialize the variant switcher
  customElements.define('variant-image-switcher', VariantImageSwitcher);
  new VariantImageSwitcher();