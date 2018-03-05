import $ from "jquery";
import _ from "underscore";

import View from "../base/view";

import StringFilterMenu from "./filter_menus/string_filter_menu";
import NumericFilterMenu from "./filter_menus/numeric_filter_menu";
import ListFilterMenu from "./filter_menus/list_filter_menu";

class DataTableFilterView extends View {
  initialize(options) {
    this.filter = options.column.filter;
    this.attr = options.column.attr;
    this.title = options.column.title;
    this.table = options.table;
    this.head = options.head;
    this.filterButtonClass = "filterInactive";

    // decide which filter view based on type, here
    let filterMenu = null;
    switch (this.filter.type) {
      case 'string':
        filterMenu = new StringFilterMenu({column: options.column, parentView: this});
        break;
      case 'numeric':
        filterMenu = new NumericFilterMenu({column: options.column, parentView: this});
        break;
      case 'list':
        filterMenu = new ListFilterMenu({column: options.column, parentView: this});
        break;
    }

    // add as a child (backdraft thing just to keep bookkeeping on subviews)
    this.child("filter-menu", filterMenu);
  }

  render() {
    this.$el.html(this.template({
      filterButtonClass: this.filterButtonClass
    }));

    this.$("[data-toggle='filter-popover']").popover({
      container: 'body',
      animation: false,
      html: true,
      content: this.child("filter-menu").render().$el,
      placement(popover, trigger) {
        // We can't know the width without rendering to DOM.
        // We can't render to DOM without knowing the width.
        // Thus is life.
        const popoverWidth = 250;

        const triggerLeftPosition = trigger.getBoundingClientRect().left;
        const triggerRightPosition = trigger.getBoundingClientRect().right;
        const windowWidth = window.innerWidth;

        // popovers are smart enough to reposition when the last of the content is at the edge of screen
        // but in a table that is positioned with fixed scrolling, it gets confused when content is
        // at the edge of viewport with more of the table still off the screen
        if ((triggerLeftPosition + popoverWidth) > windowWidth) {
          return 'left';
        } else if ((triggerRightPosition - popoverWidth) < 0) {
          return 'right';
        }

        return 'bottom';
      }
    });

    return this;
  }

  _toggleIcon(enabled) {
    const icon = $(".toggle-filter-button > span", this.$el);
    icon.removeClass("filterActive");
    icon.removeClass("filterInactive");
    if (enabled) {
      icon.addClass("filterActive");
    } else {
      icon.addClass("filterInactive");
    }
  }

  _onFilterClick() {
    $("input[type=text]", this.head).trigger("change");
    this._triggerDataTableUpdate();
  }

  _onClearClick() {
    this._childFilterMenu().clear();
    this._triggerDataTableUpdate();
  }

  disableFilter(errorMessage) {
    this._childFilterMenu().disableFilter(errorMessage);
  }

  enableFilter() {
    this._childFilterMenu().enableFilter();
  }

  _childFilterMenu() {
    return this.child("filter-menu");
  }

  _triggerDataTableUpdate() {
    this.parent.updateAjaxSource();
    this.table.dataTable._fnAjaxUpdate();
    this.$("[data-toggle='filter-popover']").popover('hide');
  }
}

_.extend(DataTableFilterView.prototype, {
  template: _.template('\
        <div class="toggle-filter-button" data-toggle="filter-popover">\
          <span class="<%= filterButtonClass %>"></span>\
        </div>\
      ', null, ListFilterMenu.DEFAULT_JST_DELIMS)
});

export default DataTableFilterView;
