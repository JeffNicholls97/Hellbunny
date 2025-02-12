class VariantImageSwitcher {
    constructor() {
      this.buttons = document.querySelectorAll('.variant-size-selector');
      this.clicked = null;  // Track the clicked button
      this.init();
    }
  
    init() {
      this.buttons.forEach(button => {
        button.classList.add('tw-opacity-50');
      });
      this.buttons.forEach(button => {
        button.addEventListener('click', (e) => this.handleVariantSelect(e));
      });
    }
  
    async handleVariantSelect(e) {
      const button = e.target;
      const variantOption = button.dataset.variantOption;
      const sectionId = button.dataset.sectionId;
      
      // If there was a previously clicked button, set it to opacity-50
      if (this.clicked) {
        this.clicked.classList.remove('tw-opacity-100');
        this.clicked.classList.add('tw-opacity-50');
      }
  
      // Update the clicked button and set it to opacity-100
      this.clicked = button;
      button.classList.remove('tw-opacity-50');
      button.classList.add('tw-opacity-100');
  
      // Get all product cards in the collection
      const productCards = document.querySelectorAll('.product-card');
      
      productCards.forEach(async (card) => {
        const productHandle = card.dataset.productHandle;
        if (!productHandle) return;
  
        // Fetch product data
        const response = await fetch(`/products/${productHandle}.js`);
        const productData = await response.json();
        
        // Find variant that matches the selected size
        const variant = productData.variants.find(variant => 
          variant.options.includes(variantOption)
        );
  
        // If variant exists and has an image, update the product card image
        if (variant && variant.featured_image) {
          const productImage = card.querySelector('.product-card__image');
          if (productImage) {
            productImage.src = variant.featured_image.src;
          }
        }
      });
    }
  }
  
  // Initialize the variant switcher
  customElements.define('variant-image-switcher', VariantImageSwitcher);
  new VariantImageSwitcher();