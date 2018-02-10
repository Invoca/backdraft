import Plugin from "../../plugin";

import View from "./view";
import Collection from "./collection";
import Model from "./model";
import Router from "./router";
import Cache from "./cache";

Plugin.factory("Base", plugin => {

  plugin.exports({
    Router,
    View,
    Model,
    Collection,
    Cache
  });

  // factories
  plugin.initializer(app => {
    app.Views = {};
    app.view = function(name, baseClassName, properties) {
      let baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = View;
      } else {
        baseClass = app.Views[baseClassName];
      }

      app.Views[name] = baseClass.extend(properties);
    };

    app.Collections = {};
    app.collection = function(name, baseClassName, properties) {
      let baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = Collection;
      } else {
        baseClass = app.Collections[baseClassName];
      }

      app.Collections[name] = baseClass.extend(properties);
    };

    app.Models = {};
    app.model = function(name, baseClassName, properties) {
      let baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = Model;
      } else {
        baseClass = app.Models[baseClassName];
      }

      app.Models[name] = baseClass.extend(properties);
    };

    app.Routers = {};
    app.router = function(name, baseClassName, properties) {
      let baseClass;
      if (arguments.length === 2) {
        properties = baseClassName;
        baseClass = Router;
      } else {
        baseClass = app.Routers[baseClassName];
      }

      app.Routers[name] = baseClass.extend(properties);
    };
  });
});
