import View from "../view";
import Cache from "../cache";

class List extends View {
  constructor(options) {
    super(options);

    if (!this.itemClass) {
      throw new Error("itemClass must be defined");
    }

    this.options = options || {};
    this.cache = new Cache();

    if (!this.collection) throw new Error("A collection must be provided");
    this.listenTo(this.collection, "add", this._onAdd);
    this.listenTo(this.collection, "remove", this._onRemove);
    this.listenTo(this.collection, "reset", this._onReset);
  }

  _onAdd(model) {
    this.$el.append(this._createNewItem(model).render().$el);
  }

  _onRemove(model) {
    this.cache.unset(model).close();
  }

  _onReset(collection) {
    this.cache.each(item => item.close());
    this.cache.reset();
    this.$el.empty();

    // optimized bulk insertion of views
    const fragment = document.createDocumentFragment();
    this.collection.each((model) => {
      fragment.appendChild(this._createNewItem(model).render().el);
    });
    this.$el.append(fragment);
  }

  _createNewItem(model) {
    const item = new this.itemClass({ model });
    this.cache.set(model, item);
    this.child(`child${item.cid}`, item);
    return item;
  }

  render() {
    this._onReset();
    return this;
  }
}

List.finalize = function(name, listClass, views) {
  const descriptor = Object.create(null);
  descriptor.get = function() {
    return views[this.itemClassName];
  };

  Object.defineProperty(listClass.prototype, 'itemClass', descriptor);

  // maintain backwards compatibility
  listClass.prototype.getItemClass = function() {
    return this.itemClass;
  };
};

export default List;
