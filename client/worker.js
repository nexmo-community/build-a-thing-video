let background = {
	x: 0,
	y: 0,
	lowerChroma: [75, 70, 25],
	upperChroma: [180, 100, 75],
	overlay: false,
	image: null
};

/**
 * Convert RGB to HSL
 *
 * From https://css-tricks.com/converting-color-spaces-in-javascript/
 */
const RGBtoHSL = (r, g, b) => {
	r /= 255;
	g /= 255;
	b /= 255;

	const cmin = Math.min(r,g,b);
	const cmax = Math.max(r,g,b);
	let delta = cmax - cmin;

	let [h, s, l] = [0, 0, 0];
	if (delta == 0) h = 0;
	else if (cmax == r) h = ((g - b) / delta) % 6;
	else if (cmax == g) h = (b - r) / delta + 2;
	else h = (r - g) / delta + 4;

	h = Math.round(h * 60);
	if (h < 0) h += 360;
	l = (cmax + cmin) / 2;
	s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
	s = +(s * 100).toFixed(1);
	l = +(l * 100).toFixed(1);

	return [h, s, l];
}

/**
 * Return if the HSL pixel should be replaced
 */
const shouldReplaceHSL = (h, s, l) => {
	const [lh, ls, ll] = background.lowerChroma;
	const [uh, us, ul] = background.upperChroma;
	if (lh < uh ? (h < lh || h > uh) : h < uh || h > lh) return false;
	if (ls < us ? (s < ls || s > us) : s < us || s > ls) return false;
	if (ll < ul ? (l < ll || l > ul) : l < ul || l > ll) return false;
	return true;
}

const ACTIONS = {
	setBackgroundImage: image => {
		background = { ...background, image };
	},
	updateBackground: update => {
		for (const key of ['lowerChroma', 'upperChroma']){
			if (update[key]) update[key] = RGBtoHSL(...update[key])
		}
		background = { ...background, ...update};
	},
	applyGreenscreenEffect: image => {
		const pixels = image.data;
		for (let i = 0; i < pixels.length; i += 4){
			// x and y of pixel to take from background image
			// Ensure both are within bounds
			const x = ((i/4) % image.width) - background.x;
			if (x < 0 || x >= background.image.width) continue;

			const y = Math.floor((i / 4) / image.width) - background.y;
			if (y < 0 || y >= background.image.height) continue;

			if (!background.overlay){
				// Check if the current pixel should be overriden with background
				const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]]
				const [h, s, l] = RGBtoHSL(r, g, b);
				if (!shouldReplaceHSL(h, s, l)) continue;
			}

			// Override with background pixel
			const bgI = y * (background.image.width * 4) + x * 4;
			pixels[i] = background.image.data[bgI];
			pixels[i + 1] = background.image.data[bgI + 1];
			pixels[i + 2] = background.image.data[bgI + 2];
			pixels[i + 3] = background.image.data[bgI + 3];
		}
		image.data = pixels;
		self.postMessage(image);
	}
}

self.addEventListener('message', event => {
	const { action, data } = event.data;

	if (ACTIONS[action]) ACTIONS[action](data);
	else console.error(`Unknown action: ${action}`);
});