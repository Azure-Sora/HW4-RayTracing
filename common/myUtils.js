function loadFileAJAX(name) {
    var xhr = new XMLHttpRequest(),
        okStatus = document.location.protocol === "file:" ? 0 : 200;
    xhr.open('GET', name, false);
    xhr.send(null);
    return xhr.status == okStatus ? xhr.responseText : null;
};

function createShader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    if (type === gl.VERTEX_SHADER)
        console.log("create vertex shader failed!")
    else
        console.log('create fragment shader failed!')
    console.log(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
}
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    if (!vertexShader || !fragmentShader) {
        return
    }
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }


    console.log(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
}

function setUniforms(gl, program, uniforms) {
    for (let name in uniforms) {
        let value = uniforms[name];
        let location = gl.getUniformLocation(program, name);
        if (location == null) continue;
        if (value instanceof Vector) {
            gl.uniform3fv(location, new Float32Array([value.elements[0], value.elements[1], value.elements[2]]));
        } else if (value instanceof Matrix) {
            gl.uniformMatrix4fv(location, false, new Float32Array(value.flatten()));
        } else {
            gl.uniform1f(location, value);
        }
    }
}

function toRad(deg) {
    return deg * Math.PI / 180;
};