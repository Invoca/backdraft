export default function log(msg) {
  if (window.console && console.log) {
    console.log(msg);
  }
}
