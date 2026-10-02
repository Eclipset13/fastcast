shader_type canvas_item;
render_mode blend_add;

uniform vec4 glow_color : source_color = vec4(0.8, 0.55, 1.0, 1.0);
uniform float intensity : hint_range(0.0, 2.0) = 1.0;

void fragment() {
	float node_alpha = COLOR.a;
	vec2 pixel = TEXTURE_PIXEL_SIZE;
	float centre = texture(TEXTURE, UV).a;
	float near_halo = 0.0;
	float far_halo = 0.0;

	for (int index = 0; index < 8; index++) {
		float angle = float(index) * 0.78539816339;
		vec2 direction = vec2(cos(angle), sin(angle));
		near_halo += texture(TEXTURE, UV + direction * pixel * 1.45).a;
		far_halo += texture(TEXTURE, UV + direction * pixel * 3.15).a;
	}

	near_halo /= 8.0;
	far_halo /= 8.0;
	float soft_rim = max(near_halo * 0.72 + far_halo * 0.44 - centre * 0.62, 0.0);
	float reflected_air = max(far_halo - centre * 0.35, 0.0) * 0.28;
	float alpha = (soft_rim + reflected_air) * intensity * glow_color.a * node_alpha;
	vec3 rgb = mix(glow_color.rgb, vec3(1.0, 0.95, 1.0), near_halo * 0.18);
	COLOR = vec4(rgb, alpha);
}
