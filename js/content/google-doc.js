
var readAloudDoc = $(".kix-paragraphrenderer").length ? new ReadAloudDoc() : new DummyReadAloudDoc();


function DummyReadAloudDoc() {
  var $popup = createPopup();

  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (index == 0) {
      showPopup();
      return [$popup.data("message")];
    }
    else return null;
  }

  function showPopup() {
    $popup.show();
    $(document.body).one("click", function() {
      $popup.hide();
    })
  }

  function createPopup() {
    if ($("#docs-extensions-menu").length) return createAddonInstructionPopup();
    else return createSaveInstructionPopup();
  }

  function createAddonInstructionPopup() {
    var $anchor = $("#docs-extensions-menu")
    var anchorOffset = $anchor.offset()
    var anchorDimension = {
      width: $anchor.outerWidth(),
      height: $anchor.outerHeight()
    }
    var $popup = $("<div>")
      .appendTo(document.body)
      .data("message", "You need to install the Read Aloud Google Workspace add-on to read aloud this document.")
      .css({
        position: "absolute",
        left: anchorOffset.left + anchorDimension.width/2 - 160,
        top: anchorOffset.top + anchorDimension.height,
        width: 320,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 999000,
        fontSize: "larger",
      })
    var $arrow = $("<div>")
      .appendTo($popup)
      .css({
        width: 0,
        height: 0,
        borderLeft: ".5em solid transparent",
        borderRight: ".5em solid transparent",
        borderBottom: ".5em solid #333",
      })
    var $text = $("<div>")
      .appendTo($popup)
      .html("Please use this menu to find and install the Read Aloud Google Workspace add-on.  For instructions, see <a style='color:yellow' target='_blank' href='https://blog.readaloud.app/2021/09/google-docs-update.html'>this post</a>.")
      .css({
        backgroundColor: "#333",
        color: "#fff",
        padding: "1em",
        borderRadius: ".5em",
      })
    return $popup;
  }

  function createSaveInstructionPopup() {
    var $anchor = $("#docs-file-menu")
    var anchorOffset = $anchor.offset()
    var anchorDimension = {
      width: $anchor.outerWidth(),
      height: $anchor.outerHeight()
    }
    var $popup = $("<div>")
      .appendTo(document.body)
      .data("message", "You need to use the Read Aloud Google Workspace add-on to read aloud this document.")
      .css({
        position: "absolute",
        left: anchorOffset.left + anchorDimension.width/2 - 300,
        top: anchorOffset.top + anchorDimension.height,
        width: 600,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 999000,
        fontSize: "larger",
      })
    var $arrow = $("<div>")
      .appendTo($popup)
      .css({
        width: 0,
        height: 0,
        borderLeft: ".5em solid transparent",
        borderRight: ".5em solid transparent",
        borderBottom: ".5em solid #333",
      })
    var $text = $("<div>")
      .appendTo($popup)
      .html("The Add-ons menu is available only in Edit mode, you are currently in Read-only mode.<br><br>Please click 'File' - 'Make a copy' to open a copy of this document in Edit mode.")
      .css({
        marginLeft: 10 - Math.min(0, anchorOffset.left + anchorDimension.width/2 - 300),
        backgroundColor: "#333",
        color: "#fff",
        padding: "1em",
        borderRadius: ".5em",
      })
    return $popup;
  }
}




function ReadAloudDoc() {
  var viewport = $(".kix-appview-editor").get(0);
  var pages = $(".kix-page");

  this.getCurrentIndex = function() {
    if (getSelectedText()) return 9999;

    for (var i=0; i<pages.length; i++) if (pages.eq(i).position().top > viewport.scrollTop+$(viewport).height()/2) break;
    return i-1;
  }

  this.getTexts = function(index, quietly) {
    if (index == 9999) return [getSelectedText()];

    var page = pages.get(index);
    if (page) {
      var oldScrollTop = viewport.scrollTop;
      viewport.scrollTop = $(page).position().top;
      return tryGetTexts(getTexts.bind(page), 2000)
        .then(function(result) {
          if (quietly) viewport.scrollTop = oldScrollTop;
          return result;
        })
    }
    else return null;
  }

  function getTexts() {
    return $(".kix-paragraphrenderer", this).get()
      .map(getInnerText)
      .map(removeDumbChars)
      .filter(isNotEmpty)
  }

  function getSelectedText() {
    hack();
    var doc = googleDocsUtil.getGoogleDocument();
    return removeDumbChars(doc.selectedText);
  }

  function removeDumbChars(text) {
    return text && text.replace(/[\n\u200c]+/g, '');
  }

  function hack() {
    var selections = $(".kix-selection-overlay").get();
    var windowHeight = $(window).height();

    //find one selection-overlay inside viewport
    var index = binarySearch(selections, function(el) {
      var viewportOffset = el.getBoundingClientRect();
      if (viewportOffset.top < 120) return 1;
      if (viewportOffset.top >= windowHeight) return -1;
      return 0;
    })

    if (index != -1) {
      var validSelections = [selections[index]];

      //identify the contiguous selection region
      var line = selections[index].parentNode;
      while (true) {
        line = findPreviousLine(line);
        if (line && $(line).hasClass("kix-lineview") && $(line.firstElementChild).hasClass("kix-selection-overlay")) validSelections.push(line.firstElementChild);
        else break;
      }

      line = selections[index].parentNode;
      while (true) {
        line = findNextLine(line);
        if (line && $(line).hasClass("kix-lineview") && $(line.firstElementChild).hasClass("kix-selection-overlay")) validSelections.push(line.firstElementChild);
        else break;
      }

      //remove all other selection-overlays
      if (selections.length != validSelections.length) $(selections).not(validSelections).remove();
    }
    else {
      $(selections).remove();
    }
  }

  function binarySearch(arr, testFn) {
    var m = 0;
    var n = arr.length - 1;
    while (m <= n) {
      var k = (n + m) >> 1;
      var cmp = testFn(arr[k]);
      if (cmp > 0) m = k + 1;
      else if (cmp < 0) n = k - 1;
      else return k;
    }
    return -1;
  }

  function findPreviousLine(line) {
    return line.previousElementSibling ||
      line.parentNode.previousElementSibling && line.parentNode.previousElementSibling.lastElementChild ||
      $(line).closest(".kix-page").prev().find(".kix-page-content-wrapper .kix-lineview").get(-1)
  }

  function findNextLine(line) {
    return line.nextElementSibling ||
      line.parentNode.nextElementSibling && line.parentNode.nextElementSibling.firstElementChild ||
      $(line).closest(".kix-page").next().find(".kix-page-content-wrapper .kix-lineview").get(0)
  }
}
