shader_type canvas_item;
render_mode blend_add;

uniform vec4 silhouette_color : source_color = vec4(0.56, 0.918, 1.0, 1.0);
uniform float blur_radius : hint_range(0.0, 4.0) = 1.0;

void fragment() {
	vec2 px = TEXTURE_PIXEL_SIZE * blur_radius;

	float a = 0.0;
	a += texture(TEXTURE, UV).a * 0.24;
	a += texture(TEXTURE, UV + vec2(px.x, 0.0)).a * 0.12;
	a += texture(TEXTURE, UV - vec2(px.x, 0.0)).a * 0.12;
	a += texture(TEXTURE, UV + vec2(0.0, px.y)).a * 0.12;
	a += texture(TEXTURE, UV - vec2(0.0, px.y)).a * 0.12;
	a += texture(TEXTURE, UV + px).a * 0.07;
	a += texture(TEXTURE, UV - px).a * 0.07;
	a += texture(TEXTURE, UV + vec2(px.x, -px.y)).a * 0.07;
	a += texture(TEXTURE, UV + vec2(-px.x, px.y)).a * 0.07;

	// Gentle falloff: no opaque white/cyan slab, only a soft translucent echo.
	a = smoothstep(0.03, 0.72, a);
	COLOR = vec4(silhouette_color.rgb * 0.78, a * silhouette_color.a);
}
