import { default as Backdraft } from "../src/entry";
import Plugin from "../src/plugin";

describe("Backdraft Namespace", function() {
  describe('app', function() {
    it('is a registry', function() {
      expect(Backdraft.app).toEqual(jasmine.any(Function));
    });
  });

  describe("plugin", function() {
    it("is plugin factory", function() {
      expect(Backdraft.plugin).toEqual(Plugin.factory);
    });
  });
});
