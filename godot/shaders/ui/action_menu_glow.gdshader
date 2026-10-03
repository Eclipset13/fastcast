shader_type canvas_item;
render_mode blend_add;

uniform vec4 accent : source_color = vec4(0.8, 0.55, 1.0, 1.0);
uniform float strength : hint_range(0.0, 2.0) = 0.4;

float ink_at(vec4 art) {
	return smoothstep(0.16, 0.8, max(art.r, max(art.g, art.b))) * art.a;
}

void fragment() {
	float halo = 0.0;
	for (int i = 0; i < 8; i++) {
		float angle = float(i) * 0.7853981634;
		vec2 direction = vec2(cos(angle), sin(angle));
		halo += ink_at(texture(TEXTURE, UV + direction * TEXTURE_PIXEL_SIZE * 4.0));
	}
	halo = halo / 8.0 + ink_at(texture(TEXTURE, UV)) * 0.25;
	float breathe = 0.96 + sin(TIME * 1.2) * 0.04;
	COLOR = vec4(accent.rgb, halo * strength * breathe * COLOR.a);
}
