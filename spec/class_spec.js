import { default as Backdraft } from "../src/entry.js";

describe("Backdraft.Utils.Class", function() {

  it("should define a generic reusable class", function() {
    expect(Backdraft.Utils.Class).toBeDefined();
  });

  it("should work like all Backbone classes", function() {
    var Vehicle = Backdraft.Utils.Class.extend({

      initialize : function(arg1) {
        this.stuff = [];
        this.stuff.push(arg1);
      },

      identify : function() {
        return "Vehicle";
      }

    });

    var Train = Vehicle.extend({

      initialize : function(arg1, arg2) {
        Train.__super__.initialize.call(this, arg1);
        this.stuff.push(arg2);
      },

      identify : function() {
        return "Train";
      }

    });

    var vehicle = new Vehicle("X");
    expect(vehicle.stuff).toEqual([ "X" ]);
    expect(vehicle.identify()).toEqual("Vehicle");

    var train = new Train("X", "Y");
    expect(train.stuff).toEqual([ "X", "Y" ]);
    expect(train.identify()).toEqual("Train");
  });

  it("should allow getter/setters to be generated", function() {
    var Vehicle = Backdraft.Utils.Class.extend({
      initialize: function() {
        this._getterSetter("doors");
        this._getterSetter("color");
      }
    });

    var vehicle = new Vehicle();
    expect(vehicle.doors()).not.toBeDefined();
    expect(vehicle.color()).not.toBeDefined();
    vehicle.doors(4);
    vehicle.color("red");
    expect(vehicle.doors()).toEqual(4);
    expect(vehicle.color()).toEqual("red");
  });

});
