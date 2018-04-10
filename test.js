import Plugin from "../../plugin";

var List = (function() {

    var Base = Plugin.factory("Base");

    var List = Base.View.extend({

        constructor : function(options) {
            this.options = options || {};
            this.cache = new Base.Cache();
            this.itemClass = this.getItemClass();
            List.__super__.constructor.apply(this, arguments);
            if (!this.collection) throw new Error("A collection must be provided");
            this.listenTo(this.collection, "add", this._onAdd);
            this.listenTo(this.collection, "remove", this._onRemove);
            this.listenTo(this.collection, "reset", this._onReset);
        },

        _onAdd : function(model) {
            this.$el.append(this._createNewItem(model).render().$el);
        },

        _onRemove : function(model) {
            this.cache.unset(model).close();
        },

        _onReset : function(collection) {
            this.cache.each(function(item) {
                item.close();
            }, this);
            this.cache.reset();
            this.$el.empty();

            // optimized bulk insertion of views
            var fragment = document.createDocumentFragment();
            this.collection.each(function(model) {
                fragment.appendChild(this._createNewItem(model).render().el);
            }, this);
            this.$el.append(fragment);
        },

        _createNewItem : function(model) {
            var item = new this.itemClass({ model : model });
            this.cache.set(model, item);
            this.child("child" + item.cid, item);
            return item;
        },

        render : function() {
            this._onReset();
            return this;
        }

    }, {

        finalize : function(name, listClass, views) {
            listClass.prototype.getItemClass = function() {
                // TODO blow up if can't find class
                return views[this.itemClassName];
            };
        }

    });

    return List;


})();

export default List;
