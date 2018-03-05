import $ from "jquery";
const jQuery = $;

import _ from "underscore";

import View from "../base/view";

const DataTableFilter = (options => {

  const DEFAULT_JST_DELIMS = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  };

  class DataTableFilterMenu extends View {

    initialize(options) {
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
            this.parentView._onFilterClick.call(this.parentView);
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
      let params=[];
      // if there are already parameters there, get them
      const urlArray = window.location.href.split("?");
      if (urlArray[1]) {
        params = $.deparam(urlArray[1]);
      }
      // get the filter settings
      const filteringSettings = this.parent.table._getFilteringSettings();

      // if there are active filters, put them in the filter_json param
      if (JSON.parse(filteringSettings).length>0) {
        params.filter_json = filteringSettings;
      }
      // otherwise delete the filter_json param to keep a clean uri
      else {
        delete params.filter_json;
      }
      // Delete ext_filter_json from the url, we're deprecating it
      delete params.ext_filter_json;

      // if history is supported, add it to the url
      if (Backbone && Backbone.history) {
        Backbone.history.navigate(`?${jQuery.param(params)}`, { trigger: false, replace: true });
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

  _.extend(DataTableFilterMenu.prototype, {
    filterMenuClass: "",

    menuTemplate: _.template(''), // to be overridden by subclasses
    parentMenuTemplate: _.template('\
     <div class="filter-menu <%= filterMenuClass %>"> \
       <% if (enabled) { %> \
         <%= menuTemplate %> \
         <div class="filter-menu-footer"> \
           <button class="btn btn-primary btn-filter" name="button" type="submit" title="">Apply</button> \
           <button class="btn btn-secondary btn-clear" name="button" type="submit" title="">Clear</button> \
         </div> \
       <% } else { %> \
         <span data-mount="error-message"> \
           <%= errorMessage %>\
         </span> \
       <% } %> \
     </div> \
      ', null, DEFAULT_JST_DELIMS),

    events: {
      "click input": "_onInputClick",
      "change input": "_onInputChange",
      "change select": "_onSelectChange"
    }
  });

  class StringFilterMenu extends DataTableFilterMenu {
    afterRender() {
      const filterArray = JSON.parse(this.parent.table._getFilteringSettings()) || [];
      // if there are filters in url, enable in UI
      if (filterArray.length > 0) {
        // find the filters that match this filter instance
        const matches = _.where(filterArray, {type: "string", attr: this.attr});
        // if there are filter params for this filter, add them to the markup
        if (matches[0]) {
          this.$el.find("input.filter-string").val(matches[0][matches[0].comparison]);
          this.parentView._toggleIcon(true);
        }
      }
    }

    _onInputChange(event) {
      const filterInput = event.target;
      if (filterInput.value === "") {
        this.filter.value = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter.value = filterInput.value;
        this.parentView._toggleIcon(true);
      }
      this._updateFilterUrlParams();
    }

    clear() {
      if (this.enabled) {
        this.$("input[type=text]").val("").trigger("change");
      } else {
        this.filter.value = null;
        this.parentView._toggleIcon(false);
        this._updateFilterUrlParams();
      }
    }
  }

  _.extend(StringFilterMenu.prototype, {
    filterMenuClass: "filter-menu-string",

    menuTemplate: _.template('\
      <div class="filter-text">Show:</div>\
      <div class="filter-menu-string-container">\
        <input class="filter-string form-control input-sm" type="text" name="filter-string" />\
      </div>\
      ', null, DEFAULT_JST_DELIMS)
  });

  class NumericFilterMenu extends DataTableFilterMenu {
    _onInputChange(event) {
      event.stopImmediatePropagation();
      const filterType = event.target.getAttribute('data-filter-type');
      const filterValue = event.target.value;
      if (filterValue === "") {
        this.filter[filterType] = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter[filterType] = filterValue;
        this.parentView._toggleIcon(true);
      }
      this._updateFilterUrlParams();
    }

    _onSelectChange(event) {
      event.stopImmediatePropagation();
      const target = $(event.target);
      const filterElementId = target.data('filter-id');
      const previousFilterType = target.data('previous-value');
      const filterType = target.val();
      this.filter[filterType] = this.filter[previousFilterType];
      delete this.filter[previousFilterType];
      target.data('previous-value', filterType);
      this.$(`#${filterElementId}`).attr('data-filter-type', filterType).trigger("change");
      this._updateFilterUrlParams();
    }

    afterRender() {
      // populate filter fields
      const filterArray = JSON.parse(this.parent.table._getFilteringSettings()) || [];
      // if there are filters in the url...
      if (filterArray.length > 0) {
        // find the filters that match this filter instance
        const matches = _.where(filterArray, {type: "numeric", attr: this.attr});
        // if there are url params for this filter...
        if (matches[0]) {
          // change the comparison type on the select dropdown
          this.$el.find("[data-filter-id=first-filter]").val(matches[0].comparison);
          // change the value of the input field
          this.$el.find("input#first-filter").val(matches[0].value).attr("data-filter-type", matches[0].comparison);

          this.parentView._toggleIcon(true);
        }
        if (matches[1]) {
          // change the comparison type on the second select dropdown
          this.$el.find("[data-filter-id=second-filter]").val(matches[1].comparison);
          // change the value of the input second field
          this.$el.find("input#second-filter").val(matches[1].value).attr("data-filter-type", matches[1].comparison);

          this.parentView._toggleIcon(true);
        }
      }
    }

    clear() {
      if (this.enabled) {
        this.$("input[type=text]").val("").trigger("change");
        this.$("select[data-filter-id=first-filter]").val("gt").trigger("change");
        this.$("select[data-filter-id=second-filter]").val("lt").trigger("change");
      } else {
        this.filter.lt = null;
        this.filter.gt = null;
        this.filter.eq = null;

        this.parentView._toggleIcon(false);
        this._updateFilterUrlParams();
      }
    }
  }

  _.extend(NumericFilterMenu.prototype, {
    filterMenuClass: "filter-menu-numeric",

    menuTemplate: _.template('\
      <div class="filter-text">Show items with value that:</div> \
      <div class="filter-menu-numeric-container"> \
        <select class="filter-type form-control" data-filter-id="first-filter" data-previous-value="gt">\
          <option selected value="gt">is greater than</option> \
          <option value="lt">is less than</option> \
          <option value="eq">is equal to</option> \
        </select> \
        <input id="first-filter" class="filter-value form-control" type="text" data-filter-type="gt" /> \
        <div class="filter-text">and</div> \
        <select class="filter-type form-control" data-filter-id="second-filter" data-previous-value="lt">\
          <option value="gt">is greater than</option> \
          <option selected value="lt">is less than</option> \
          <option value="eq">is equal to</option> \
        </select> \
        <input id="second-filter" class="filter-value form-control" type="text" data-filter-type="lt" /> \
      </div> \
    ', null, DEFAULT_JST_DELIMS)
  });

  class ListFilterMenu extends DataTableFilterMenu {
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
      ', null, DEFAULT_JST_DELIMS)
  });

  class DataTableFilter extends View {
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

  _.extend(DataTableFilter.prototype, {
    template: _.template('\
        <div class="toggle-filter-button" data-toggle="filter-popover">\
          <span class="<%= filterButtonClass %>"></span>\
        </div>\
      ', null, DEFAULT_JST_DELIMS)
  });

  return new DataTableFilter(options);
});

export default DataTableFilter;
