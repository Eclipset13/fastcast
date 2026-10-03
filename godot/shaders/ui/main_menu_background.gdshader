shader_type canvas_item;

uniform float selection_blend : hint_range(0.0, 1.0) = 0.0;
uniform float selected_index = 0.0;

vec3 red_grade(vec3 c) {
	return clamp(vec3(
		0.01855545 * c.r + 0.64281351 * c.g + 0.54680216 * c.b - 0.00754080,
		0.69673739 * c.r + 0.65129094 * c.g - 0.55323503 * c.b + 0.03294242,
		1.67035890 * c.r - 0.68049519 * c.g - 0.26755323 * c.b + 0.05645035
	), vec3(0.0), vec3(1.0));
}

vec3 blue_grade(vec3 c) {
	return clamp(vec3(
		1.33053111 * c.r - 0.30414532 * c.g - 0.39706997 * c.b + 0.04583519,
		-0.13056967 * c.r + 0.87045537 * c.g + 0.24195543 * c.b + 0.01276146,
		-0.38640719 * c.r + 0.15585227 * c.g + 1.21932504 * c.b - 0.00754229
	), vec3(0.0), vec3(1.0));
}

vec3 selected_grade(vec3 purple, vec3 red, vec3 blue) {
	if (selected_index < 0.5) {
		return purple;
	}
	if (selected_index < 1.5) {
		return red;
	}
	return blue;
}

void fragment() {
	vec4 source = texture(TEXTURE, UV);
	vec3 purple = source.rgb;
	vec3 red = red_grade(source.rgb);
	vec3 blue = blue_grade(source.rgb);

	// Three environmental palettes with broad, feathered overlaps.
	float purple_to_red = smoothstep(0.285, 0.385, UV.x);
	float red_to_blue = smoothstep(0.615, 0.715, UV.x);
	vec3 split_background = mix(purple, red, purple_to_red);
	split_background = mix(split_background, blue, red_to_blue);

	// A very soft seam darkening preserves the reference's vertical separation
	// without creating visible rectangular panels.
	float seam_left = 1.0 - smoothstep(0.0, 0.055, abs(UV.x - 0.335));
	float seam_right = 1.0 - smoothstep(0.0, 0.055, abs(UV.x - 0.665));
	float seam = max(seam_left, seam_right);
	split_background *= 1.0 - seam * 0.055;

	vec3 focused_background = selected_grade(purple, red, blue);
	vec3 final_rgb = mix(split_background, focused_background, smoothstep(0.0, 1.0, selection_blend));

	// Keep the composition cinematic and readable around the UI edges.
	float edge = min(min(UV.x, 1.0 - UV.x), min(UV.y, 1.0 - UV.y));
	float vignette = smoothstep(0.0, 0.20, edge);
	final_rgb *= mix(0.95, 1.0, vignette);

	COLOR = vec4(final_rgb, source.a);
}
