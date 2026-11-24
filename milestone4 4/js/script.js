$(function () {
  const PAGE_SIZE = 10;
  let searchBooks = [];
  let currentPage = 1;
  let currentQuery = "";
  let collectionBooks = [];
  let collectionLoaded = false;

  function safeText(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (value.value) return value.value;
    return fallback;
  }

  function normalizeBook(book) {
    const workId = book.key || "";
    return {
      workId: workId,
      title: safeText(book.title, "Title unavailable"),
      author: safeText((book.author_name || (book.authors || []).map(a => a.name))[0], "Author unavailable"),
      year: safeText(book.first_publish_year, "Publication year unavailable"),
      cover: book.cover_i || book.cover_id
        ? "https://covers.openlibrary.org/b/id/" + (book.cover_i || book.cover_id) + "-M.jpg"
        : "https://placehold.co/150x220/f0eee7/53624e?text=No+Cover"
    };
  }

  function renderBooks(books, target) {
    const html = Mustache.render($("#book-template").html(), { books: books });
    $("#" + target).html(html);
  }

  function showStatus(target, message, isError) {
    $("#" + target).text(message).toggleClass("error", !!isError);
  }

  function renderSearchPage() {
    const start = (currentPage - 1) * PAGE_SIZE;
    renderBooks(searchBooks.slice(start, start + PAGE_SIZE), "search-results");
    const pages = Math.max(1, Math.ceil(searchBooks.length / PAGE_SIZE));
    $("#pagination").html(
      '<button id="previous-page" ' + (currentPage === 1 ? "disabled" : "") + '>Previous</button>' +
      '<span>Page ' + currentPage + ' of ' + pages + '</span>' +
      '<button id="next-page" ' + (currentPage === pages ? "disabled" : "") + '>Next</button>'
    );
    $("#search-summary").text(searchBooks.length + " books found for “" + currentQuery + "”");
  }

  $("#search-form").on("submit", function (event) {
    event.preventDefault();
    currentQuery = $("#search-input").val().trim();
    if (!currentQuery) return;
    $(".tab[data-section=search-section]").trigger("click");
    currentPage = 1;
    searchBooks = [];
    $("#search-results, #pagination").empty();
    showStatus("search-status", "Searching Open Library...", false);
    $.ajax({
      url: "https://openlibrary.org/search.json",
      data: { q: currentQuery, limit: 50, fields: "key,title,author_name,first_publish_year,cover_i" },
      dataType: "json"
    }).done(function (data) {
      searchBooks = (data.docs || []).slice(0, 50).map(normalizeBook);
      if (!searchBooks.length) {
        showStatus("search-status", "No books found. Try another title, author, or keyword.", false);
        $("#search-summary").text("0 books found");
        return;
      }
      showStatus("search-status", "", false);
      renderSearchPage();
    }).fail(function () {
      showStatus("search-status", "Something went wrong while loading books. Please try again.", true);
    });
  });

  $("#pagination").on("click", "#previous-page", function () {
    if (currentPage > 1) { currentPage--; renderSearchPage(); }
  });
  $("#pagination").on("click", "#next-page", function () {
    if (currentPage < Math.ceil(searchBooks.length / PAGE_SIZE)) { currentPage++; renderSearchPage(); }
  });

  function loadCollection() {
    if (collectionLoaded) return;
    showStatus("collection-status", "Loading the Fantasy collection...", false);
    $.ajax({
      url: "https://openlibrary.org/subjects/fantasy.json",
      data: { limit: 10 },
      dataType: "json"
    }).done(function (data) {
      collectionBooks = (data.works || []).slice(0, 10).map(normalizeBook);
      collectionLoaded = true;
      if (!collectionBooks.length) {
        showStatus("collection-status", "No books are available in this collection right now.", false);
        return;
      }
      showStatus("collection-status", "", false);
      renderBooks(collectionBooks, "collection-results");
    }).fail(function () {
      showStatus("collection-status", "Unable to load the collection. Please try again later.", true);
    });
  }

  $(".tabs").on("click", ".tab", function () {
    const section = $(this).data("section");
    $(".tab").removeClass("active");
    $(this).addClass("active");
    $(".content-section").addClass("hidden");
    $("#" + section).removeClass("hidden");
    if (section === "collection-section") loadCollection();
  });

  $(".view-controls").on("click", ".view-btn", function () {
    const target = $(this).data("target");
    const view = $(this).data("view");
    $(this).siblings(".view-btn").removeClass("active");
    $(this).addClass("active");
    $("#" + target).toggleClass("list-view", view === "list");
  });

  function showBookDetails(workId, fallbackBook) {
    if (!workId) {
      $("#details-panel").html("<p>More details are not available for this book.</p>");
      return;
    }
    $("#details-panel").html('<p class="muted">Loading book details...</p>');
    $.ajax({
      url: "https://openlibrary.org" + workId + ".json",
      dataType: "json"
    }).done(function (work) {
      const authorKeys = (work.authors || []).slice(0, 5).map(a => a.author && a.author.key).filter(Boolean);
      const authorRequests = authorKeys.map(key => $.getJSON("https://openlibrary.org" + key + ".json"));
      const authorPromise = authorRequests.length ? $.when.apply($, authorRequests) : $.Deferred().resolve().promise();
      authorPromise.always(function () {
        let authors = [];
        if (authorRequests.length === 1) {
          const response = arguments[0];
          if (response && response.name) authors.push(response.name);
        } else if (authorRequests.length > 1) {
          for (let i = 0; i < authorRequests.length; i++) {
            const response = arguments[i] && arguments[i][0];
            if (response && response.name) authors.push(response.name);
          }
        }
        const desc = typeof work.description === "string" ? work.description :
          (work.description && work.description.value) || "No description is available for this book.";
        const subjects = (work.subjects || []).slice(0, 10).join(", ") || "No subjects listed.";
        const detail = {
          title: safeText(work.title, fallbackBook.title),
          workId: workId,
          author: authors.join(", ") || fallbackBook.author || "Author information unavailable.",
          cover: fallbackBook.cover,
          description: desc,
          subjects: subjects,
          publishInfo: fallbackBook.year !== "Publication year unavailable" ? "First published: " + fallbackBook.year : "Publication information unavailable.",
          language: "Language information may not be available for every record."
        };
        $("#details-panel").html(Mustache.render($("#details-template").html(), detail));
      });
    }).fail(function () {
      $("#details-panel").html('<div class="details-content"><h2>' + $("<div>").text(fallbackBook.title).html() + '</h2><p>Unable to retrieve additional details. Please try another book.</p></div>');
    });
  }

  $(document).on("click", ".book-select", function () {
    const workId = $(this).data("work-id");
    const allBooks = searchBooks.concat(collectionBooks);
    const book = allBooks.find(item => item.workId === workId);
    if (book) showBookDetails(workId, book);
  });

  $("#details-panel").on("click", "#close-details", function () {
    $("#details-panel").html('<div class="details-placeholder"><span class="detail-icon">✦</span><h2>Book details</h2><p>Select a book to see more information here. Your search and collection will stay right where they are.</p></div>');
  });

  loadCollection();
});
