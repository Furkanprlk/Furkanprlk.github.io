/*!
 * Item: Kitzu
 * Description: Personal Portfolio Template
 * Author/Developer: Exill
 * Author/Developer URL: https://themeforest.net/user/exill
 * Version: v2.0.0
 * License: Themeforest Standard Licenses: https://themeforest.net/licenses
 */

/*----------- CUSTOM JS SCRIPTS -----------*/

(function($) {
  'use strict';
  $(function() {
    // Code here executes When the DOM is loaded...

    /* Project details: show the clicked thumbnail in the image stage */
    $(document).on('click', '.project-detail .stage-thumbs button', function() {
      var thumb = $(this);
      var stage = thumb.closest('.project-stage');
      var src = thumb.data('src');
      var alt = thumb.find('img').attr('alt');
      stage.find('.stage-image').attr({
        src: src,
        alt: alt,
        width: thumb.data('width'),
        height: thumb.data('height')
      });
      stage.find('.stage-backdrop').attr('src', src);
      stage.find('.stage-link').attr('href', src);
      stage.find('.stage-caption').text(alt);
      thumb.addClass('is-active').attr('aria-pressed', 'true')
        .siblings().removeClass('is-active').attr('aria-pressed', 'false');
    });
  });
  $(window).on('load', function() {
    // Code here executes When the page is loaded
  });
}(jQuery));