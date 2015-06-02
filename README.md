# Backdraft
Wrapper around Backbone providing integration with [DataTables](https://www.datatables.net/), as well as other utilities for creating Backbone views and models. 
Written as a plugin-based framework, where the DataTables integration is a plugin itself, and Backdraft can be further extended with your own plugins.

## Usage
First, define a new Backdraft app and what plugins it will use:

```javascript
Backdraft.app("TableExample", {
  plugins : [ "DataTable"],

  activate : function($el) {
    this.mainRouter = new this.Routers.Main({ $el : $el });
    Backbone.history.start({ });
  }
});
```

Now, everything else gets namespaced within the Backdrapt app name:

```javascript
// routers/main.js
Backdraft.app("TableExample", function(app) {
  app.router("Main", {
    routes : {
      "" : "index"
    },

    index : function() {
      var view = new app.Views.Index();
      this.swap(view);
    }
  });

});

// models/book.js
Backdraft.app("TableExample", function(app) {
  app.model("Book", {});
});

// collections/book.js
Backdraft.app("TableExample", function(app) {
  app.collection("Books", {
    model : app.Models.Book
  });
});

// views/book_table.js
Backdraft.app("TableExample", function(app) {
  app.view.dataTable("BookTable", {
    rowClassName : "BookRow",
    paginate : false
  });
});

// views/book_row.js
Backdraft.app("TableExample", function(app) {
  app.view.dataTable.row("BookRow", {
    columns : [
      { bulk : true },
      { attr : "name", title : "Name" },
      { attr : "created_at", title : "Created" }
    ]
  });
});
```

Now create the view that pulls all the pieces together:

```
// views/index.js
Backdraft.app("TableExample", function(app) {
  app.view("Index", {
    render : function() {
      var collection  = new app.Collections.Books();
      var data = [];

      // fake data
      for (var iter = 0; iter < 10; ++iter) {
        data.push({ name : "Book " + (iter + 1) });
      }

      collection.add(data);
      var table = new app.Views.BookTable({ collection : collection });

      this.$el.html(table.render().$el);
      return this;
    }
  });
});
```

Finally, in an HTML page that loads the above scripts, include the dist/backdraft.js file in your assets.
You must also include the required vendor files (jQuery & underscore.js), plus dataTables.js if using the datatables plugin.

Then activate the app at load time:

```html
<html>
  <head>
    ...
  </head>
  <body>
    <div id="example-area"></div>

    <script type="text/javascript">
      Backdraft.app("TableExample").activate($("#example-area"));
    </script>
  </body>
</html>
```

### Examples
If you run `grunt`, an local server will be launched with live examples at [localhost:9873](http://localhost:9873). 


## Develop & Contribute

### Environment Setup
To develop a Backdraft plugin or modify Backdraft, the following setup needs to be done first (this assumes a Mac running OS 10.9+):

* Install NVM, the Node Version Manager https://github.com/creationix/nvm
 *  ```curl https://raw.githubusercontent.com/creationix/nvm/v0.10.0/install.sh | sh```
* Open a new tab in your terminal
* Install Node.js with:
 *  ``` nvm install v0.10.26```
* Set it as the default Node.js version
 * ```nvm alias default 0.10.26```
* Install grunt-cli
 * ```npm install -g grunt-cli```


### Testing

Run the grunt task from the main directory to have the source and test files watched and tests auto-run when any modifications are done

    grunt
    
You can also specifically run tests with:

    grunt spec
    
See all available commands with:

    grunt --help


### Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## License
[MIT](https://github.com/Invoca/backdraft/blob/master/LICENSE).
