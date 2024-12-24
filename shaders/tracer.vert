attribute vec3 vertex;

uniform vec3 ray00;
uniform vec3 ray01;
uniform vec3 ray11;
uniform vec3 ray10;

varying vec3 initialRay;
void main() {
    vec2 percent = vertex.xy * 0.5 + 0.5;
    initialRay = mix(mix(ray00, ray01, percent.y), mix(ray10, ray11, percent.y), percent.x);
    gl_Position = vec4(vertex, 1.0);
}