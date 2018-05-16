import initializeBootstrap from "./bootstrap";
import initializeColReorderPlugin from "./dataTables.colReorder";

export default function() {
  initializeBootstrap();
  initializeColReorderPlugin();
}
