/**
 * Moving footage and photos, loaded straight from Pexels (free to use under
 * the Pexels licence, credit appreciated). Posters load first; the video
 * only starts once the section is on screen, so pages stay fast.
 */
export interface Clip {
  video?: string;
  poster: string;
  alt: string;
  credit: string;
  page: string;
}

const poster = (url: string, w = 1600) => `${url}?auto=compress&cs=tinysrgb&w=${w}`;

export const HERO_CLIP: Clip = {
  video: 'https://videos.pexels.com/video-files/17929832/17929832-uhd_2560_1440_30fps.mp4',
  poster: poster('https://images.pexels.com/videos/17929832/calm-clouds-dream-drenthe-17929832.jpeg'),
  alt: 'Sunrise seen from above a sea of clouds',
  credit: 'Matthias Groeneveld',
  page: 'https://www.pexels.com/video/the-sun-rising-over-the-clouds-from-above-17929832/',
};

export const COUNTRY_CLIPS: Record<string, Clip> = {
  india: {
    video: 'https://videos.pexels.com/video-files/31485217/13424673_2560_1440_100fps.mp4',
    poster: poster('https://images.pexels.com/videos/31485217/pexels-photo-31485217.jpeg'),
    alt: 'A crowded street market in India with bright shop signs',
    credit: 'Yogendra Singh',
    page: 'https://www.pexels.com/video/bustling-market-street-in-india-31485217/',
  },
  japan: {
    video: 'https://videos.pexels.com/video-files/4200101/4200101-hd_1920_1080_30fps.mp4',
    poster: poster('https://images.pexels.com/videos/4200101/japan-tokyo-zebra-crossing-4200101.jpeg'),
    alt: 'Timelapse of people crossing Shibuya Crossing in Tokyo',
    credit: 'Sheraz Khan',
    page: 'https://www.pexels.com/video/time-lapse-video-of-the-busy-famous-shibuya-crossing-4200101/',
  },
  italy: {
    video: 'https://videos.pexels.com/video-files/12982743/12982743-uhd_2560_1440_30fps.mp4',
    poster: poster('https://images.pexels.com/videos/12982743/italy-piazza-rome-tourists-12982743.jpeg'),
    alt: 'People in Piazza Navona, Rome',
    credit: 'James Anthony',
    page: 'https://www.pexels.com/video/people-on-square-in-rome-12982743/',
  },
  finland: {
    video: 'https://videos.pexels.com/video-files/5976338/5976338-uhd_2732_1440_24fps.mp4',
    poster: poster('https://images.pexels.com/videos/5976338/baltic-sea-bath-bathe-bathing-5976338.jpeg'),
    alt: 'A sea view through the window of a wooden sauna',
    credit: 'Yaroslav Shuraev',
    page: 'https://www.pexels.com/video/view-of-the-sea-by-the-window-inside-a-sauna-room-5976338/',
  },
  singapore: {
    poster: poster('https://images.pexels.com/photos/13967613/pexels-photo-13967613.jpeg'),
    alt: 'Staff preparing food at a busy hawker stall in Singapore',
    credit: 'Alec Doualetas',
    page: 'https://www.pexels.com/photo/people-working-in-bar-kitchen-13967613/',
  },
};
