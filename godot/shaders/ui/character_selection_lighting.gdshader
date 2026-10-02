shader_type canvas_item;
render_mode blend_add;

uniform vec4 glow_color : source_color = vec4(0.79, 0.53, 1.0, 1.0);
uniform float intensity : hint_range(0.0, 1.5) = 1.0;
uniform float seed = 0.0;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
		mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
		f.y
	);
}

float fbm(vec2 p) {
	float value = 0.0;
	float weight = 0.52;
	for (int octave = 0; octave < 4; octave++) {
		value += noise(p) * weight;
		p = p * 2.03 + vec2(7.7, 3.1);
		weight *= 0.48;
	}
	return value;
}

void fragment() {
	float node_alpha = COLOR.a;
	vec2 uv = UV;
	float x = uv.x - 0.5;
	float pulse = 1.0 + sin(TIME * 1.15 + seed) * 0.055;

	float side_fade = smoothstep(0.0, 0.16, uv.x) * smoothstep(0.0, 0.16, 1.0 - uv.x);
	float top_fade = smoothstep(0.0, 0.14, uv.y);
	float bottom_fade = smoothstep(0.0, 0.07, 1.0 - uv.y);
	float edge_fade = side_fade * top_fade * bottom_fade;

	float taper = mix(0.62, 1.0, smoothstep(0.02, 0.84, uv.y));
	float shaped_x = x / taper;
	float broad_beam = exp(-pow(shaped_x / 0.34, 2.0));
	float central_beam = exp(-pow(shaped_x / 0.115, 2.0));
	float white_core = exp(-pow(shaped_x / 0.042, 2.0));
	float beam_height = smoothstep(0.0, 0.28, uv.y) * (1.0 - smoothstep(0.91, 1.0, uv.y));

	float ray_a = exp(-pow((x + 0.205 + sin(TIME * 0.19 + seed) * 0.008) / 0.018, 2.0));
	float ray_b = exp(-pow((x - 0.176 + sin(TIME * 0.23 + seed * 1.7) * 0.006) / 0.026, 2.0));
	float ray_c = exp(-pow((x + 0.075) / 0.010, 2.0));
	float streak_flicker = 0.77 + sin(TIME * 0.72 + seed * 3.0) * 0.12;
	float streaks = (ray_a * 0.12 + ray_b * 0.10 + ray_c * 0.065) * streak_flicker * beam_height;

	vec2 floor_p = vec2(x / 0.40, (uv.y - 0.79) / 0.105);
	float floor_bloom = exp(-dot(floor_p, floor_p));
	vec2 spill_p = vec2(x / 0.53, (uv.y - 0.84) / 0.17);
	float environment_spill = exp(-dot(spill_p, spill_p));
	vec2 body_p = vec2(x / 0.29, (uv.y - 0.58) / 0.31);
	float body_air = exp(-dot(body_p, body_p));

	vec2 smoke_uv = vec2(x * 3.2 + seed, uv.y * 3.0 - TIME * 0.055);
	float smoke_noise = fbm(smoke_uv + vec2(sin(uv.y * 7.0 + TIME * 0.11), 0.0));
	float smoke = smoothstep(0.44, 0.82, smoke_noise) * broad_beam * beam_height;

	float alpha = (
		broad_beam * beam_height * 0.105 +
		central_beam * beam_height * 0.205 +
		white_core * beam_height * 0.07 +
		floor_bloom * 0.68 +
		environment_spill * 0.22 +
		body_air * 0.13 +
		streaks +
		smoke * 0.15
	) * edge_fade * intensity * pulse;

	float hot_center = clamp(white_core * beam_height * 0.34 + floor_bloom * 0.42, 0.0, 0.58);
	vec3 light_rgb = mix(glow_color.rgb, vec3(1.0, 0.94, 1.0), hot_center);
	COLOR = vec4(light_rgb, alpha * glow_color.a * node_alpha);
}
