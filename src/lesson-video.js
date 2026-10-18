/**
 * Player YouTube yang dapat dipakai ulang pada setiap materi.
 *
 * Contoh:
 * <lesson-video
 *   video-url="https://youtu.be/VIDEO_ID"
 *   title="Video pembelajaran">
 * </lesson-video>
 */
class LessonVideo extends HTMLElement {
  connectedCallback() {
    const videoId = this.getVideoId(this.getAttribute('video-url'));
    const title = this.getAttribute('title') || 'Video pembelajaran';

    if (!videoId) {
      console.warn('lesson-video membutuhkan URL YouTube yang valid.');
      this.hidden = true;
      return;
    }

    this.innerHTML = `
      <div style="position:relative;width:100%;padding-top:56.25%;overflow:hidden;">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${videoId}"
          title="${this.escapeHtml(title)}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
          style="position:absolute;inset:0;width:100%;height:100%;border:0;">
        </iframe>
      </div>`;
  }

  getVideoId(url) {
    try {
      const parsed = new URL(url);
      const isYoutube = ['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(parsed.hostname);
      const isShortUrl = parsed.hostname === 'youtu.be';
      const id = isShortUrl ? parsed.pathname.slice(1) : (isYoutube ? parsed.searchParams.get('v') : '');
      return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : '';
    } catch {
      return '';
    }
  }

  escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
  }
}

customElements.define('lesson-video', LessonVideo);
