shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_nearest;
uniform float saturation : hint_range(0.0, 2.5) = 1.24;
uniform float vibrance : hint_range(0.0, 1.5) = 0.18;

void fragment() {
	vec4 source = texture(screen_texture, SCREEN_UV);
	vec3 color = source.rgb;

	float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
	float max_channel = max(color.r, max(color.g, color.b));
	float min_channel = min(color.r, min(color.g, color.b));
	float chroma = max_channel - min_channel;

	// Saturation-only grading. Neutral colors (especially white/gray UI)
	// remain neutral and keep their original brightness.
	float adaptive_boost = vibrance * (1.0 - smoothstep(0.18, 0.78, chroma));
	float final_saturation = saturation + adaptive_boost;
	color = mix(vec3(luma), color, final_saturation);

	// Preserve exact luminance range: no contrast, brightness, shadow crush
	// or highlight compression is applied here.
	COLOR = vec4(clamp(color, vec3(0.0), vec3(1.0)), source.a);
}
