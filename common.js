// Shared helpers for all three pages (jQuery, same style as Milestone 1)
var OL = 'https://openlibrary.org';
var NA = '<span class="na">Not available</span>';

function esc(v) { return $('<div>').text(v).html(); }

function showStatus(text, isError) {
  if (!text) { $('#status').empty(); return; }
  $('#status').html('<p class="msg' + (isError ? ' error' : '') + '">' + esc(text) + '</p>');
}

// Cover id comes from cover_i (search) or the covers array (works); skip invalid ids like -1.
function coverUrl(id, size) {
  return id > 0 ? 'https://covers.openlibrary.org/b/id/' + id + '-' + size + '.jpg' : null;
}

// One book card: small cover (or placeholder) and a title linking to the details page.
function bookCard(workId, title, coverId) {
  var url = coverUrl(coverId, 'S');
  var cover = url
    ? '<img src="' + url + '" alt="Cover of ' + esc(title) + '">'
    : '<div class="no-cover">No cover</div>';
  return '<article class="book"><div class="cover">' + cover + '</div>' +
    '<h2><a href="details.html?id=' + encodeURIComponent(workId) + '">' + esc(title) + '</a></h2></article>';
}
