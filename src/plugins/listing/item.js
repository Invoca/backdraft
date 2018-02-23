import View from "../base/view";

class Item extends View {

  closeItem() {
    this.model.collection.remove(this.model);
  }
}

export default Item;
