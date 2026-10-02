shader_type canvas_item;
render_mode blend_add;

uniform vec4 glow_color : source_color = vec4(0.8, 0.55, 1.0, 1.0);
uniform float intensity : hint_range(0.0, 2.0) = 1.0;

void fragment() {
	vec2 p = UV;
	float x = p.x - 0.5;

	float wide = exp(-(x * x) / 0.080);
	float core = exp(-(x * x) / 0.018);
	float vertical_fade = smoothstep(0.0, 0.12, p.y) * (1.0 - smoothstep(0.91, 1.0, p.y));

	vec2 floor_delta = vec2((p.x - 0.5) / 0.36, (p.y - 0.83) / 0.16);
	float floor_bloom = exp(-dot(floor_delta, floor_delta));

	float ray_a = exp(-pow((x - 0.16) / 0.035, 2.0));
	float ray_b = exp(-pow((x + 0.18) / 0.045, 2.0));
	float rays = (ray_a + ray_b) * 0.12;

	float alpha = (
		wide * 0.20 +
		core * 0.34 +
		floor_bloom * 0.58 +
		rays
	) * vertical_fade * intensity;

	// Keep the centre bright without turning it into a solid rectangle.
	vec3 rgb = glow_color.rgb * (0.72 + core * 0.38 + floor_bloom * 0.24);
	COLOR = vec4(rgb, alpha * glow_color.a);
}
