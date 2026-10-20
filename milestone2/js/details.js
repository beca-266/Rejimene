$(function () {
  var workId = new URLSearchParams(window.location.search).get('id');

  if (!workId || !/^OL\d+W$/.test(workId)) {
    showStatus('No book selected. Choose a book from the Home page or My Bookshelf.', true);
    return;
  }
  showStatus('Loading book…');

  $.getJSON(OL + '/works/' + workId + '.json')
    .done(function (b) {
      var title = b.title || 'Untitled';
      document.title = title + ' | Open Library';
      showStatus('');

      // Description is either plain text or an object with a value property
      var desc = '';
      if (typeof b.description === 'string') desc = b.description;
      else if (b.description && b.description.value) desc = b.description.value;

      var cover = b.covers && b.covers.length ? coverUrl(b.covers[0], 'M') : null;
      var coverHtml = cover
        ? '<img src="' + cover + '" alt="Cover of ' + esc(title) + '">'
        : '<div class="no-cover">No cover available</div>';

      // Up to 10 subjects
      var subjects = '';
      $.each((b.subjects || []).slice(0, 10), function (i, s) { subjects += '<li>' + esc(s) + '</li>'; });

      var html = '<div class="top"><div class="covers">' + coverHtml + '</div><div>' +
        '<h1>' + esc(title) + '</h1>' +
        '<p class="muted">Work ID: ' + esc(workId) + '</p>' +
        '<p><a href="' + OL + '/works/' + workId + '">View on Open Library</a></p></div></div>' +
        '<section class="panel"><h2>Description</h2><p class="description">' + (desc ? esc(desc) : NA) + '</p></section>' +
        '<section class="panel"><h2>Subjects</h2>' + (subjects ? '<ul class="subjects">' + subjects + '</ul>' : '<p>' + NA + '</p>') + '</section>';

      $('#book').html(html);
    })
    .fail(function () {
      showStatus('This book could not be loaded. Return to the Home page and try another.', true);
    });
});
