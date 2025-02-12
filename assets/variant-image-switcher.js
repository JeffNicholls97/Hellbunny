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
  
    handleVariantSelect(e) {
      const button = e.target;
      
      // Set all buttons to opacity-50
      this.buttons.forEach(btn => {
        btn.classList.remove('tw-opacity-100');
        btn.classList.add('tw-opacity-50');
      });
  
      // Set clicked button to opacity-100
      button.classList.remove('tw-opacity-50');
      button.classList.add('tw-opacity-100');
    }
  }
  
  // Initialize the variant switcher
  customElements.define('variant-image-switcher', VariantImageSwitcher);