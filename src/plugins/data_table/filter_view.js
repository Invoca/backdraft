var DataTableFilter = (function(options) {
  var Base = Backdraft.plugin("Base");

  var DEFAULT_JST_DELIMS = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  };

  var DataTableFilterMenu = Base.View.extend({
    menuTemplate: _.template(''), // to be overridden by subclasses

    initialize: function (options) {
      this.filter = options.column.filter;
      this.attr = options.column.attr;
      this.title = options.column.title;
      this.parentView = options.parentView;
    },

    events: {
      "click input": "_onInputClick",
      "change input": "_onInputChange"
    },

    render: function () {
      this.beforeRender();

      this.$el.html(this.menuTemplate({
        filter: this.filter,
        attr: this.attr,
        title: this.title,
        parentView: this.parentView
      }));

      this.afterRender();
      return this;
    },

    beforeRender: function () {
      // to be optionally implemented by subclasses
    },

    afterRender: function () {
      // to be optionally implemented by subclasses
    },

    _onInputClick: function (event) {
      event.target.focus();
      event.stopImmediatePropagation();
    },

    _onInputChange: function (event) {
      // to be implemented by subclasses
    }
  });

  var StringFilterMenu = DataTableFilterMenu.extend({
    menuTemplate: _.template('\
        <input class="filter-string" id ="value" type="text" placeholder="Search <%= title %>" />\
      ', null, DEFAULT_JST_DELIMS),

    _onInputChange: function (event) {
      var filterInput = event.target;
      if (filterInput.value === "") {
        this.filter.value = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter.value = filterInput.value;
        this.parentView._toggleIcon(true);
      }
    }
  });

  var NumericFilterMenu = DataTableFilterMenu.extend({
    tagName: "ul",

    menuTemplate: _.template('\
        <li> &gt; <input data-numeric-filter-name="gt" class="filter-numeric filter-numeric-greater" type="text" /></li> \
        <li> &lt; <input data-numeric-filter-name="lt" class="filter-numeric filter-numeric-less" type="text"/></li> \
        <li> = <input data-numeric-filter-name="eq" class="filter-numeric filter-numeric-equal" type="text" /></li> \
      ', null, DEFAULT_JST_DELIMS),

    _onInputChange: function (event) {
      var filterInput = event.target;
      var numericValueName = $(filterInput).attr("data-numeric-filter-name");
      if (filterInput.value === "") {
        this.filter[numericValueName] = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter[numericValueName] = filterInput.value;
        this.parentView._toggleIcon(true);
      }
    }
  });

  var ListFilterMenu = DataTableFilterMenu.extend({
    tagName: "ul",

    menuTemplate: _.template('\
        <% _.each(filter.options, function(element, index) { %>\
          <li>\
            <label>\
              <input class="list" id="value" type="checkbox" name="<%= attr %>" value="<%= element %>" /> \
              <%= element %>\
            </label>\
          </li>\
        <% }) %>\
      ', null, DEFAULT_JST_DELIMS),

    afterRender: function () {
      var listClass;

      if (this.filter.options.length > 30) {
        listClass = "triple";
      } else if (this.filter.options.length > 15) {
        listClass = "double";
      } else {
        listClass = "single";
      }

      this.$el.addClass(listClass);
    },

    _onInputChange: function (event) {
      var filterInput = event.target;
      if (filterInput.checked) {
        this.filter.value = this.filter.value || [];
        this.filter.value.push(filterInput.value);
        this.parentView._toggleIcon(true);
      }
      // remove filter from column manager if it is defined
      else if (this.filter.value) {
        var index = this.filter.value.indexOf(filterInput.value);
        if (index > -1) {
          this.filter.value.splice(index, 1);
        }
        if (this.filter.value.length === 0) {
          this.filter.value = null;
          this.parentView._toggleIcon(false);
        }
      }
    }
  });

  var DataTableFilter = Base.View.extend({
    template: _.template('\
        <div class="toggle-filter-button" data-toggle="dropdown">\
          <span class="<%= filterButtonClass %>"></span>\
        </div>\
        <div class="filterMenu dropdown-menu">\
          <button class="btn btn-primary btn-sm btn-filter" name="button" type="submit" title="">Filter</button>\
          <button class="btn btn-primary btn-sm btn-clear" name="button" type="submit" title="">Clear</button>\
        </div>\
      ', null, DEFAULT_JST_DELIMS),

    events: {
      "click .toggle-filter-button": "_onToggleClick",
      "click .btn-filter": "_onFilterClick",
      "click .btn-clear": "_onClearClick"
    },

    initialize: function (options) {
      this.filter = options.column.filter;
      this.attr = options.column.attr;
      this.title = options.column.title;
      this.table = options.table;
      this.head = options.head;
      this.filterButtonClass = "filterInactive";

      // decide which filter view based on type, here
      var filterMenu = null;
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
    },

    render: function () {
      this.$el.html(this.template({
        filterButtonClass: this.filterButtonClass
      }));

      $(".filterMenu", this.$el).prepend(this.child("filter-menu").render().$el);
      return this;
    },

    _toggleIcon: function (enabled) {
      var icon = $("span", this.$el);
      icon.removeClass("filterActive");
      icon.removeClass("filterInactive");
      if (enabled) {
        icon.addClass("filterActive");
      } else {
        icon.addClass("filterInactive");
      }
    },

    _onToggleClick: function (event) {
      var table = this.table;
      event.stopImmediatePropagation();
      var currentFilterMenu = $('.filterMenu', this.$el);
      if ((table.activeFilterMenu) && (table.activeFilterMenu.is(currentFilterMenu))) {
        table.activeFilterMenu.slideUp(100);
        table.activeFilterMenu = null;
      } else if (table.activeFilterMenu) {
        table.activeFilterMenu.slideUp(100, function () {
          table.activeFilterMenu = currentFilterMenu;
          table.activeFilterMenu.slideDown(200);
        });
      } else {
        table.activeFilterMenu = currentFilterMenu;
        table.activeFilterMenu.slideDown(200);
      }
    },

    _onFilterClick: function () {
      $("input[type=text]", this.head).trigger("change");
      this.table.dataTable._fnAjaxUpdate();
    },

    _onClearClick: function () {
      $("input[type=text]", this.head).val("");
      $("input[type=checkbox]", this.head).attr("checked", false);
      $("input", this.head).trigger("change");
      this.table.dataTable._fnAjaxUpdate();
    }
  });

  return new DataTableFilter(options);
});