export default function cidMap(collection) {
  return collection.map(function(model) {
    return { cid: model.cid };
  });
}
