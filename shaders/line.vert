attribute vec3 vertex;
uniform vec3 cubeMin;
uniform vec3 cubeMax;
uniform mat4 modelviewProjection;
void main() {
    gl_Position = modelviewProjection * vec4(mix(cubeMin, cubeMax, vertex), 1.0);
}