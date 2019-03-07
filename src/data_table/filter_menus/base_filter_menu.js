import View from "../../view";
import _ from "underscore";

import Backbone from "backbone";
import $ from "jquery";

import "jquery-deparam";

class BaseFilterMenu extends View {
  constructor(options) {
    super(options);

    this.filter = options.column.filter;
    this.attr = options.column.attr;
    this.title = options.column.title;
    this.parentView = options.parentView;
    this.enabled = true;
  }

  render() {
    this.beforeRender();

    this.$el.html(this.parentMenuTemplate({
      filterMenuClass: this.filterMenuClass,
      enabled: this.enabled,
      errorMessage: this.errorMessage,
      menuTemplate: this.menuTemplate({
        filter: this.filter,
        attr: this.attr,
        title: this.title,
        parentView: this.parentView
      })
    }));

    this.afterRender();

    if (this.enabled) {
      // Bind button clicks
      this.$('.btn-filter').click(_.bind(this.parentView._onFilterClick, this.parentView));
      this.$('.btn-clear').click(_.bind(this.parentView._onClearClick, this.parentView));

      // Bind "enter" key
      this.$('.filter-menu').keyup(_.bind(function(event) {
        const key = event.keyCode || event.which;
        if (key === 13) {
          this.parentView._onFilterClick();
        }
      }, this));
    }

    return this;
  }

  beforeRender() {
    // to be optionally implemented by subclasses
  }

  afterRender() {
    // to be optionally implemented by subclasses
  }

  _onInputClick(event) {
    event.target.focus();
    event.stopImmediatePropagation();
  }

  _onInputChange(event) {
    // to be implemented by subclasses
  }

  _onSelectChange(event) {
    // to be optionally implemented by subclasses
  }

  _updateFilterUrlParams() {
    // get url parameters into an array
    let params = [];
    // if there are already parameters there, get them
    const urlArray = window.location.href.split("?");
    if (urlArray[1]) {
      params = $.deparam(urlArray[1]);
    }
    // get the filter settings
    const filteringSettings = this.parent.table._getFilteringSettings();

    // if there are active filters, put them in the filter_json param
    if (JSON.parse(filteringSettings).length > 0) {
      params.filter_json = filteringSettings;
    } else {
      // otherwise delete the filter_json param to keep a clean uri
      delete params.filter_json;
    }
    // Delete ext_filter_json from the url, we're deprecating it
    delete params.ext_filter_json;

    // if history is supported, add it to the url
    if (Backbone && Backbone.history) {
      Backbone.history.navigate(`?${$.param(params)}`, { trigger: false, replace: true });
    }
  }

  disableFilter(errorMessage) {
    this.errorMessage = errorMessage;
    this.enabled = false;
  }

  enableFilter() {
    this.enabled = true;
  }
}

BaseFilterMenu.DEFAULT_JST_DELIMS = {
  evaluate: /<%([\s\S]+?)%>/g,
  interpolate: /<%=([\s\S]+?)%>/g,
  escape: /<%-([\s\S]+?)%>/g
};

_.extend(BaseFilterMenu.prototype, {
  filterMenuClass: "",

  menuTemplate: _.template(''), // to be overridden by subclasses
  parentMenuTemplate: _.template(`
     <div class="filter-menu <%= filterMenuClass %>">
       <% if (enabled) { %>
         <%= menuTemplate %>
         <div class="filter-menu-footer">
           <button class="btn btn-primary btn-filter" name="button" type="submit" title="">Apply</button>
           <button class="btn btn-secondary btn-clear" name="button" type="submit" title="">Clear</button>
         </div>
       <% } else { %>
         <span data-mount="error-message">
           <%= errorMessage %>
         </span>
       <% } %> 
     </div>
      `, null, BaseFilterMenu.DEFAULT_JST_DELIMS),

  events: {
    "click input": "_onInputClick",
    "change input": "_onInputChange",
    "change select": "_onSelectChange"
  }
});

export default BaseFilterMenu;
