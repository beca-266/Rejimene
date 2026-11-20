var OL = 'https://openlibrary.org';
var PER_PAGE = 10;
var MAX_RESULTS = 50;

var searchTerm = '';
var searchResults = [];
var currentPage = 1;
var detailCache = {};

// Display application messages
function showStatus(message, isError) {
    if (!message) {
        $('#status').empty();
        return;
    }

    $('#status').html(
        '<p class="msg' + (isError ? ' error' : '') +
        '">' + escapeHTML(message) + '</p>'
    );
}

// Prevent HTML from being interpreted as markup
function escapeHTML(value) {
    return $('<div>').text(value || '').html();
}

// Get a cover image URL
function coverUrl(id, size) {
    return id > 0
        ? 'https://covers.openlibrary.org/b/id/' + id + '-' + size + '.jpg'
        : null;
}

// Display a cover or a placeholder
function createCover(id, title, size) {
    var url = coverUrl(id, size);

    if (!url) {
        return '<div class="no-cover">No cover available</div>';
    }

    return '<img src="' + url +
        '" alt="Cover of ' + escapeHTML(title) + '">';
}

// Display a book card
function bookCard(book) {
    var workId = book.key.split('/').pop();
    var title = book.title || 'Untitled';
    var coverId = book.cover_i || 0;

    var html = '<article class="book">' +
        '<div class="cover">' +
        createCover(coverId, title, 'S') +
        '</div>' +
        '<div class="book-info">' +
        '<button type="button" class="book-select" data-id="' +
        escapeHTML(workId) + '">' +
        escapeHTML(title) +
        '</button>';

    if (book.author_name && book.author_name.length) {
        html += '<p class="muted">' +
            escapeHTML(book.author_name.join(', ')) +
            '</p>';
    }

    html += '</div></article>';

    return html;
}

// Search form
$('#searchForm').on('submit', function (e) {
    e.preventDefault();

    var value = $.trim($('#term').val());

    if (!value) {
        $('#results').empty();
        $('#pager').prop('hidden', true);
        showStatus('Enter a title, author, or topic to search.', true);
        return;
    }

    searchTerm = value;
    currentPage = 1;

    searchResults = [];
    $('#results').empty();
    $('#book').html('<p class="muted">Select a book to view its details.</p>');
    $('#pager').prop('hidden', true);

    loadSearch();
});

// Retrieve up to 50 search results
function loadSearch() {
    showStatus('Loading search results...');

    $('#searchButton').prop('disabled', true);

    $.ajax({
        url: OL + '/search.json',
        method: 'GET',
        dataType: 'json',
        data: {
            q: searchTerm,
            limit: MAX_RESULTS,
            page: 1
        }
    })
    .done(function (data) {
        searchResults = (data.docs || []).slice(0, MAX_RESULTS);

        if (!searchResults.length) {
            $('#results').html(
                '<p class="msg">No books found for "' +
                escapeHTML(searchTerm) +
                '". Try different keywords.</p>'
            );

            $('#pager').prop('hidden', true);
            showStatus('');
            return;
        }

        showStatus('');
        displayResults();
    })
    .fail(function () {
        $('#results').empty();
        $('#pager').prop('hidden', true);

        showStatus(
            'The search failed. Check your connection and try again.',
            true
        );
    })
    .always(function () {
        $('#searchButton').prop('disabled', false);
    });
}

// Display 10 books per page
function displayResults() {
    $('#results').empty();

    var start = (currentPage - 1) * PER_PAGE;
    var end = start + PER_PAGE;

    var pageBooks = searchResults.slice(start, end);

    $.each(pageBooks, function (i, book) {
        var card = $(bookCard(book));

        // Keep author information available when a book is selected
        card.find('.book-select').data('book', book);

        $('#results').append(card);
    });

    var totalPages = Math.ceil(searchResults.length / PER_PAGE);

    $('#pageInfo').text(
        'Page ' + currentPage + ' of ' + totalPages
    );

    $('#previous').prop('disabled', currentPage === 1);
    $('#next').prop('disabled', currentPage === totalPages);

    $('#pager').prop('hidden', totalPages <= 1);
}

// Previous page
$('#previous').on('click', function () {
    if (currentPage > 1) {
        currentPage--;
        displayResults();
    }
});

// Next page
$('#next').on('click', function () {
    var totalPages = Math.ceil(searchResults.length / PER_PAGE);

    if (currentPage < totalPages) {
        currentPage++;
        displayResults();
    }
});

// Select a book from search results or collection
$(document).on('click', '.book-select', function () {
    var workId = $(this).attr('data-id');
    var book = $(this).data('book');

    loadDetails(workId, book);
});

// Retrieve selected-book details
function loadDetails(workId, selectedBook) {
    $('#book').html('<p class="muted">Loading book details...</p>');

    if (detailCache[workId]) {
        displayDetails(detailCache[workId], selectedBook);
        return;
    }

    $.ajax({
        url: OL + '/works/' + workId + '.json',
        method: 'GET',
        dataType: 'json'
    })
    .done(function (book) {
        detailCache[workId] = book;
        displayDetails(book, selectedBook);
    })
    .fail(function () {
        $('#book').html(
            '<p class="msg error">Unable to load this book. Please try another.</p>'
        );
    });
}

// Display selected-book information
function displayDetails(book, selectedBook) {
    var title = book.title || 'Untitled';

    var workId = book.key.split('/').pop();

    // Description can be text or an object with a value property
    var description = '';

    if (typeof book.description === 'string') {
        description = book.description;
    } else if (book.description && book.description.value) {
        description = book.description.value;
    }

    // Use search or collection author information when available
    var authors = '';

    if (selectedBook && selectedBook.author_name) {
        authors = selectedBook.author_name.join(', ');
    } else if (selectedBook && selectedBook.authors) {
        authors = selectedBook.authors.map(function (author) {
            return typeof author === 'string'
                ? author
                : author.name || '';
        }).filter(Boolean).join(', ');
    }

    // Get cover from work record or selected book
    var coverId = book.covers && book.covers.length
        ? book.covers[0]
        : selectedBook && selectedBook.cover_i
            ? selectedBook.cover_i
            : 0;

    // Get up to 10 subjects
    var subjects = '';

    $.each((book.subjects || []).slice(0, 10), function (i, subject) {
        subjects += '<li>' + escapeHTML(subject) + '</li>';
    });

    var html = '<div class="top">' +
        '<div class="covers">' +
        createCover(coverId, title, 'M') +
        '</div>' +
        '<div>' +
        '<h1>' + escapeHTML(title) + '</h1>' +
        '<p class="muted">Work ID: ' + escapeHTML(workId) + '</p>' +
        '<p>Author(s): ' +
        (authors ? escapeHTML(authors) : 'Not available') +
        '</p>' +
        '<p><a href="' + OL + '/works/' +
        encodeURIComponent(workId) +
        '" target="_blank">View on Open Library</a></p>' +
        '</div></div>';

    html += '<section class="panel">' +
        '<h2>Description</h2>' +
        '<p class="description">' +
        (description
            ? escapeHTML(description)
            : '<span class="muted">Description not available.</span>') +
        '</p></section>';

    html += '<section class="panel">' +
        '<h2>Subjects</h2>' +
        (subjects
            ? '<ul class="subjects">' + subjects + '</ul>'
            : '<p class="muted">Subjects not available.</p>') +
        '</section>';

    $('#book').html(html);
}

// Load the predefined Fantasy collection
function loadCollection() {
    $('#collection').html(
        '<p class="muted">Loading Fantasy collection...</p>'
    );

    $.ajax({
        url: OL + '/subjects/fantasy.json',
        method: 'GET',
        dataType: 'json',
        data: {
            limit: 10
        }
    })
    .done(function (data) {
        var books = data.works || [];

        $('#collection').empty();

        if (!books.length) {
            $('#collection').html(
                '<p class="msg">No books are currently available in this collection.</p>'
            );
            return;
        }

        $.each(books.slice(0, 10), function (i, book) {
            var workId = book.key.split('/').pop();

            var item = {
                key: book.key,
                title: book.title || 'Untitled',
                authors: book.authors || [],
                cover_i: book.cover_id || 0
            };

            var card = $(bookCard(item));
            card.find('.book-select').data('book', item);

            $('#collection').append(card);
        });
    })
    .fail(function () {
        $('#collection').html(
            '<p class="msg error">The Fantasy collection could not be loaded. Please try again later.</p>'
        );
    });
}

// Load collection when the application opens
$(document).ready(function () {
    loadCollection();
});
