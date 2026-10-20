$(function () {
  var PER_PAGE = 10;    // results per page
  var MAX_RESULTS = 60; // assignment cap
  var term = '';

  $('#searchForm').on('submit', function (e) {
    e.preventDefault();
    var value = $.trim($('#term').val());
    if (!value) {
      $('#results').empty();
      $('#pager').prop('hidden', true);
      showStatus('Enter a title, author, or topic to search.', true);
      return;
    }
    term = value;  // a new search always starts at page 1
    loadPage(1);
  });

  // Changing the page reuses the stored term, so the search stays the same.
  $('#pageSelect').on('change', function () { loadPage(Number($(this).val())); });

  function loadPage(page) {
    showStatus('Loading results…');
    var url = OL + '/search.json?q=' + encodeURIComponent(term) + '&limit=' + PER_PAGE + '&page=' + page;
    $.getJSON(url)
      .done(function (data) { render(data, page); })
      .fail(function () {
        $('#results').empty();
        $('#pager').prop('hidden', true);
        showStatus('The search failed. Check your connection and try again.', true);
      });
  }

  function render(data, page) {
    var docs = data.docs || [];
    $('#results').empty();
    if (!docs.length) {
      $('#pager').prop('hidden', true);
      showStatus('No books found for "' + term + '". Try different keywords.');
      return;
    }
    showStatus('');

    // Main loop over the docs array
    $.each(docs, function (i, book) {
      var workId = book.key.split('/').pop();
      $('#results').append(bookCard(workId, book.title || 'Untitled', book.cover_i));
    });

    var total = Math.min(data.numFound, MAX_RESULTS);
    var pages = Math.ceil(total / PER_PAGE);
    var options = '';
    for (var p = 1; p <= pages; p++) {
      options += '<option value="' + p + '"' + (p === page ? ' selected' : '') + '>' + p + '</option>';
    }
    $('#pageSelect').html(options);
    $('#pageInfo').text('of ' + pages + ' (' + total + ' results)');
    $('#pager').prop('hidden', pages <= 1);
  }
});
