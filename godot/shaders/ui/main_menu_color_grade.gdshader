shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_nearest;
uniform float saturation : hint_range(0.0, 2.5) = 1.38;
uniform float vibrance : hint_range(0.0, 1.5) = 0.36;
uniform float contrast : hint_range(0.5, 1.8) = 1.10;
uniform float brightness : hint_range(-0.25, 0.25) = 0.015;
uniform float shadow_depth : hint_range(0.0, 0.35) = 0.06;

void fragment() {
	vec4 source = texture(screen_texture, SCREEN_UV);
	vec3 color = source.rgb;

	float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
	float max_channel = max(color.r, max(color.g, color.b));
	float min_channel = min(color.r, min(color.g, color.b));
	float chroma = max_channel - min_channel;

	// Stronger saturation everywhere, with extra vibrance reserved for colors
	// that are not already near clipping. Whites and neutral UI stay neutral.
	float adaptive_saturation = saturation + vibrance * (1.0 - smoothstep(0.10, 0.72, chroma));
	color = mix(vec3(luma), color, adaptive_saturation);

	// Add depth without crushing the already dark night background.
	color = (color - vec3(0.5)) * contrast + vec3(0.5 + brightness);
	float shadow_mask = 1.0 - smoothstep(0.08, 0.48, luma);
	color *= 1.0 - shadow_mask * shadow_depth;

	// Preserve luminous magic highlights instead of clipping them into flat white.
	float peak = max(color.r, max(color.g, color.b));
	if (peak > 1.0) {
		color /= peak;
		color *= 1.0 - exp(-peak);
	}

	COLOR = vec4(clamp(color, vec3(0.0), vec3(1.0)), source.a);
}
