export class Item {
  private limit = 99;
  constructor(
    public id: number | string,
    public name: string,
    public description: string,
    public effectId: number,
    public effectPotency: number,
    public spriteKey: string,
    public frame: number,
    public category: string,
    public quantity: number = 1) {
  }
  public incrementQuantity() {
    if (this.quantity >= this.limit) {
      this.quantity = this.quantity;
    }
    else {
      this.quantity++;
    }
  }
  public decrementQuantity() {
    if (this.quantity <= 0) {
      this.quantity = this.quantity;
    }
    else {
      this.quantity--;
    }
  }
  public setQuantity(amount: number) {
    this.quantity = amount;
  }
}