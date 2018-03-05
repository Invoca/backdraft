import _ from "underscore";
import BaseFilterMenu from "./base_filter_menu";

class ListFilterMenu extends BaseFilterMenu {
  afterRender() {
    const filterArray = JSON.parse(this.parent.table._getFilteringSettings()) || [];
    // if there are filters in the url...
    if (filterArray.length > 0) {
      // find the filters that match this filter instance
      const matches = _.where(filterArray, {type: "list", attr: this.attr});

      // if there are url params for this filter...
      if (matches[0]) {
        // go through each of those list values
        matches[0].value.forEach( (element, index, array) => {
          // check it
          this.$el.find(`input[value="${element}"]`).prop("checked", true);
        });
        // make the button show
        this.parentView._toggleIcon(true);
      }
    }

    let listClass;

    if (this.filter.options.length > 30) {
      listClass = "triple";
    } else if (this.filter.options.length > 15) {
      listClass = "double";
    } else {
      listClass = "single";
    }

    this.$("ul").addClass(listClass);
    this.$(".select-all").click(_.bind(this._selectAll, this));
  }

  _selectAll(event) {
    this.$('li input:checkbox:not(:checked)').each(_.bind(function(i, el) {
      this.$(el).click();
    }, this));
  }

  _onInputChange(event) {
    const filterInput = event.target;
    if (filterInput.checked) {
      this.filter.value = this.filter.value || [];
      this.filter.value.push(filterInput.value);
      this.parentView._toggleIcon(true);
    }
    // remove filter from column manager if it is defined
    else if (this.filter.value) {
      const index = this.filter.value.indexOf(filterInput.value);
      if (index > -1) {
        this.filter.value.splice(index, 1);
      }
      if (this.filter.value.length === 0) {
        this.filter.value = null;
        this.parentView._toggleIcon(false);
      }
    }
    this._updateFilterUrlParams();
  }

  clear() {
    if (this.enabled) {
      this.$("input[type=checkbox]").attr("checked", false).trigger("change");
    } else {
      this.filter.value = null;
      this.parentView._toggleIcon(false);
      this._updateFilterUrlParams();
    }
  }
}

_.extend(ListFilterMenu.prototype, {
  filterMenuClass: "filter-menu-list",

  menuTemplate: _.template('\
      <div class="filter-text">Show:</div>\
      <a class="select-all" href="javascript:;">Select all</a>\
      <ul class="filter-menu-list-container">\
        <% _.each(filter.options, function(element, index) { %>\
          <li>\
            <label>\
              <input class="list list-item-input" type="checkbox" name="<%= attr %>" value="<%- element %>" /> \
              <%= element %>\
            </label>\
          </li>\
        <% }) %>\
      </ul>\
      ', null, BaseFilterMenu.DEFAULT_JST_DELIMS)
});

export default ListFilterMenu;
