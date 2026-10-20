$(function () {
  // Work IDs of my chosen books; titles and covers come from the API.
  var SHELF = ['OL262758W', 'OL893415W', 'OL1168083W', 'OL66554W', 'OL45804W'];
  var cards = [];
  var failed = 0;
  var requests = [];
  showStatus('Loading bookshelf…');

  $.each(SHELF, function (i, id) {
    var req = $.getJSON(OL + '/works/' + id + '.json')
      .done(function (b) { cards[i] = bookCard(id, b.title || 'Untitled', b.covers && b.covers[0]); })
      .fail(function () { failed++; });
    requests.push(req);
  });

  // Wait for every request (success or failure), then show the books in shelf order.
  $.when.apply($, $.map(requests, function (r) { return r.then(null, function () { return $.Deferred().resolve(); }); }))
    .always(function () {
      $('#shelf').html(cards.join(''));
      showStatus(failed ? failed + ' book(s) could not be loaded.' : '', failed > 0);
    });
});
