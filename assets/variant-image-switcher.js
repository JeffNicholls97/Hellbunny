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
      const variantOption = button.dataset.variantOption;
      const sectionId = button.dataset.sectionId;

      console.log(e)
      
      // Remove active state from all buttons
      this.buttons.forEach(btn => btn.classList.add('tw-opacity-100'));
      // Add active state to clicked button
      button.classList.add('tw-opacity-50');
  
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