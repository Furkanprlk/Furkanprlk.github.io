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

    /* Buttons that open a section lightbox (e.g. "View my work" on the home screen) */
    $(document).on('click', '[data-open-section]', function(event) {
      event.preventDefault();
      $('.navbar .nav-link[href="#' + $(this).data('open-section') + '"]').trigger('click');
    });

    /* Contact: copy the e-mail address */
    $(document).on('click', '.contact-copy', function() {
      var button = $(this);
      var text = button.data('copy');
      var done = function() {
        button.addClass('is-copied').find('span').text('Copied');
        setTimeout(function() {
          button.removeClass('is-copied').find('span').text('Copy');
        }, 2000);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done);
      } else {
        var field = $('<textarea readonly>').val(text).css({ position: 'fixed', opacity: 0 }).appendTo('body');
        field[0].select();
        document.execCommand('copy');
        field.remove();
        done();
      }
    });

    /* Project details: pause an embedded YouTube video (needs enablejsapi=1 in the embed URL) */
    function pauseVideo(stage) {
      stage.find('.stage-video').each(function() {
        if (this.contentWindow) {
          this.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
      });
    }

    /* Project details: show the clicked thumbnail (photo or video) in the stage */
    $(document).on('click', '.project-detail .stage-thumbs button', function() {
      var thumb = $(this);
      var stage = thumb.closest('.project-stage');
      var isVideo = thumb.is('[data-video]');
      stage.find('.stage-video-wrap').toggleClass('is-hidden', !isVideo);
      stage.find('.stage-link').toggleClass('is-hidden', isVideo);
      if (isVideo) {
        stage.find('.stage-caption').text(thumb.data('caption'));
      } else {
        pauseVideo(stage);
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
      }
      thumb.addClass('is-active').attr('aria-pressed', 'true')
        .siblings().removeClass('is-active').attr('aria-pressed', 'false');
    });

    /* Unload the video player when its project dialog is closed: this stops the video and
       keeps the player from loading again in the background when lity moves the dialog back */
    $(document).on('lity:close', '.project-detail', function() {
      $(this).find('.stage-video').each(function() {
        var video = $(this);
        if (!video.data('src')) {
          video.data('src', video.attr('src'));
        }
        video.attr('src', 'about:blank');
      });
    });

    /* Load the player again when the dialog is opened again */
    $(document).on('lity:ready', '.project-detail', function() {
      $(this).find('.stage-video').each(function() {
        var video = $(this);
        if (video.data('src') && video.attr('src') === 'about:blank') {
          video.attr('src', video.data('src'));
        }
      });
    });
  });
  $(window).on('load', function() {
    // Code here executes When the page is loaded
  });
}(jQuery));