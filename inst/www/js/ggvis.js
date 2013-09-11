/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
    strict:false, undef:true, unused:true, browser:true, jquery:true, maxerr:50,
    curly:false, multistr:true */
/*global vg*/
var ggvis = window.ggvis = window.ggvis || {};  // If already defined, just extend it

ggvis.pendingData = {};  // data objects that have been received but not yet used
ggvis.charts = {};       // all vega chart objects on the page
ggvis.specs = {};        // all specs
ggvis.initialized = {};  // track whether each chart has been updated at least once
ggvis.renderer = null;


ggvis.parseSpec = function(spec, plotId) {

  vg.parse.spec(spec, function(chart) {
    var selector = ".ggvis-output#" + plotId;
    var $el = $(selector);

    chart = chart({ el: selector, renderer: ggvis.renderer });
    // Save the chart object
    ggvis.charts[plotId] = chart;
    $el.data("ggvis-chart", chart);

    // If the data arrived earlier, use it.
    if (ggvis.pendingData[plotId]) {
      chart.data(ggvis.pendingData[plotId]);
      delete ggvis.pendingData[plotId];
    }

    // When done resizing, update with new width and height
    $el.resizable({
      helper: "ui-resizable-helper",
      grid: [10, 10],
      stop: function() {
        var padding = chart.padding();
        chart.width($el.width() - padding.left - padding.right);
        chart.height($el.height() - padding.top - padding.bottom);
        chart.update();
      }
    });

    if (ggvis.data_ready(plotId)) {
      opts = {};
      if (ggvis.initialized[plotId]) opts.duration = 250;

      chart.update(opts);
      ggvis.updateGgvisDivSize(plotId);
      ggvis.initialized[plotId] = true;
    }
  });
};


// Sets height and width of wrapper div to contain the plot area.
// This is so that the resize handle will be put in the right spot.
ggvis.updateGgvisDivSize = function(plotId) {
  var $el = $(".ggvis-output#" + plotId);
  var $plotarea = $el.find("div.vega > .marks");

  $el.width($plotarea.width());
  $el.height($plotarea.height());
};

// Given the name of a plot and an <a> element, set the href of that element
// to the canvas content of the plot converted to PNG. This will set the href
// when the link is clicked; the download happens when it is released.
ggvis.updateDownloadLink = function(plotId, el) {
  var plot = $("#" + plotId + ".ggvis-output .marks")[0];
  var imageUrl;

  if (ggvis.renderer === "svg") {
    // Extract the svg code and add needed xmlns attribute
    var svg = $(plot).clone().attr("xmlns", "http://www.w3.org/2000/svg");
    // Convert to string
    svg = $('<div>').append(svg).html();
    imageUrl = "data:image/octet-stream;base64,\n" + btoa(svg);

  } else if (ggvis.renderer === "canvas") {
    imageUrl = plot.toDataURL("image/png").replace("image/png", "image/octet-stream");
  }

  // Set download filename and data URL
  var ext = "";
  if      (ggvis.renderer === "svg")    ext = ".svg";
  else if (ggvis.renderer === "canvas") ext = ".png";
  el.setAttribute("download", plotId + ext);
  el.setAttribute("href", imageUrl);
};

// Change the renderer and update all plots
ggvis.setRenderer = function(renderer) {
  ggvis.renderer = renderer;

  for (var plotId in ggvis.specs) {
    if (ggvis.specs.hasOwnProperty(plotId))
      ggvis.charts[plotId].renderer(renderer).update();
  }
};

// Set the value of the renderer selector, if present
ggvis.setRendererChooser = function(renderer) {
  var $el = $("#ggvis_renderer");
  if ($el) {
    $el.val(renderer);
  }
};

ggvis.updateDownloadButtonText = function() {
  var $el = $("#ggvis_download");
  if ($el) {
    var filetype = "";
    if      (ggvis.renderer === "svg")    filetype = "SVG";
    else if (ggvis.renderer === "canvas") filetype = "PNG";

    $el.text("Download " + filetype);
  }
};


// Utility functions ----------------------------------------------------------

// Returns true if all data objects for a spec have been registered, using
// ggvis.charts[plotId].data(dataset)
ggvis.data_ready = function(plotId) {
  var existing_data = Object.keys(ggvis.charts[plotId].data());
  var expected_data = ggvis.specs[plotId].data.map(function (x) {
    return x.name ;
  });

  return ggvis.arrays_equal(existing_data, expected_data);
};

// Returns true if arrays have same contents (in any order), false otherwise.
ggvis.arrays_equal = function(a, b) {
  return $(a).not(b).length === 0 && $(b).not(a).length === 0;
};



$(function(){ //DOM Ready
  var $el;

  // Attach event handlers to buttons
  $el = $("button#quit");
  if ($el) {
    $el.on("click", function() { window.close(); });
  }

  $el = $("#ggvis_download");
  if ($el) {
    $el.on("click", function() {
      var plotId = $(this).data("plot-id");
      ggvis.updateDownloadLink(plotId, this);
    });
  }

  $el = $("#ggvis_renderer");
  if ($el) {
    $el.on("change", function() {
      ggvis.setRenderer(this.value);
      ggvis.updateDownloadButtonText();
    });
  }
});
