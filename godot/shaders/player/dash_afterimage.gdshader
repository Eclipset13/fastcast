shader_type canvas_item;
render_mode blend_add;

uniform vec4 silhouette_color : source_color = vec4(0.56, 0.918, 1.0, 1.0);

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	COLOR = vec4(silhouette_color.rgb, tex.a * silhouette_color.a);
}
