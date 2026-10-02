shader_type canvas_item;
render_mode blend_add;

uniform vec4 silhouette_color : source_color = vec4(0.56, 0.918, 1.0, 1.0);
uniform float blur_radius : hint_range(0.0, 4.0) = 1.0;

void fragment() {
	vec2 px = TEXTURE_PIXEL_SIZE * blur_radius;

	float a = 0.0;
	a += texture(TEXTURE, UV).a * 0.30;
	a += texture(TEXTURE, UV + vec2(px.x, 0.0)).a * 0.10;
	a += texture(TEXTURE, UV - vec2(px.x, 0.0)).a * 0.10;
	a += texture(TEXTURE, UV + vec2(0.0, px.y)).a * 0.10;
	a += texture(TEXTURE, UV - vec2(0.0, px.y)).a * 0.10;
	a += texture(TEXTURE, UV + px).a * 0.075;
	a += texture(TEXTURE, UV - px).a * 0.075;
	a += texture(TEXTURE, UV + vec2(px.x, -px.y)).a * 0.075;
	a += texture(TEXTURE, UV + vec2(-px.x, px.y)).a * 0.075;

	// Very soft, low-energy afterimage. Keep the silhouette translucent even
	// where several echoes overlap during the dash.
	a = smoothstep(0.02, 0.86, a) * 0.56;
	COLOR = vec4(silhouette_color.rgb * 0.46, a * silhouette_color.a);
}
