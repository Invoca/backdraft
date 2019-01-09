import _ from "underscore";
import Backbone from "backbone";

const splatParam = /\*\w+/g;
const optionalParam = /\((.*?)\)/g;

// helper method for creating Rails style named routes
function createNameHelper(name, route) {
  return (params, splat) => {
    // replace splat
    let genRoute = route.replace(splatParam, splat || "");
    // replace required params
    _.each(params, (v, k) => {
      genRoute = genRoute.replace(`:${k}`, v);
    });
    _.each(genRoute.match(optionalParam), p => {
      if (_.include(p, ":")) {
        // optional param unfulfilled, remove it
        genRoute = genRoute.replace(p, "");
      } else {
        // optional param fulfilled, remove just the parens
        genRoute = genRoute.replace(p, p.slice(1, -1));
      }
    });
    if (_.include(genRoute, ":")) throw new Error(`Route for ${name} can't be created`);
    return genRoute;
  };
}

class Router extends Backbone.Router {
  constructor(options) {
    super(options);

    options = options || {};

    if (!options.$el || options.$el.length !== 1) throw new Error("$el can't be found");
    this.$el = options.$el;
  }

  get nameHelper() {
    if (!this._nameHelper) {
      this._nameHelper = {};
    }

    return this._nameHelper;
  }

  navigate(fragment, options) {
    const doNavigation = super.navigate.bind(this, fragment, options || true);

    if (this.activeView && this.activeView.beforeNavigate) {
      this.activeView.beforeNavigate(doNavigation);
    } else {
      doNavigation();
    }
  }

  route(route, name, callback) {
    let nameHelperMethod;
    if (!_.isFunction(name)) {
      if (!_.isArray(name)) {
        nameHelperMethod = name;
      } else {
        nameHelperMethod = name[1];
        name = name[0];
      }

      this.nameHelper[nameHelperMethod] = createNameHelper(nameHelperMethod, route);
    }

    return super.route(route, name, callback);
  }

  swap(nextView) {
    this.activeView && this.activeView.close();
    this.activeView = nextView;
    this.activeView.trigger("beforeSwap", this);
    // render new view and place into router's element
    this.activeView.render();
    this.$el.html(this.activeView.$el);
    this.activeView.trigger("afterSwap", this);
  }
}

export default Router;
