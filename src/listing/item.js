import View from "../view";

class Item extends View {
  closeItem() {
    this.model.collection.remove(this.model);
  }
}

export default Item;
