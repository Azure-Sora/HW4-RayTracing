precision mediump float;
const float INFINITY = 1000000.0;
const vec3 SCENE_COLOR = vec3(0.1, 0.1, 0.1);
const vec3 WHITE = vec3(1.0);
const int MAX_BOUNCE = 5;
const int SAMPLE_NUM = 50;
varying vec3 initialRay;
uniform vec3 eye;
uniform vec3 center;
uniform float radius;
float seed = 0.93725856;
struct Cube {
    vec3 minCorner;
    vec3 maxCorner;
};
struct Sphere {
    vec3 center;
    float radius;
};
struct LightSource {
    vec3 position;
    float intensity;
    float lightSize;
};
Cube room = Cube(vec3(-1.0, -1.0, -1.0), vec3(1.0, 1.0, 1.0));
LightSource light = LightSource(vec3(0, 0.8, 0), 0.8, 0.2);
Sphere s1 = Sphere(vec3(0, 0.75, 0), 0.25);
Sphere s2 = Sphere(vec3(0, 0.25, 0), 0.25);
Sphere s3 = Sphere(vec3(0, -0.25, 0), 0.25);
Sphere s4 = Sphere(vec3(0, -0.75, 0), 0.25);
float intersectSphere(vec3 origin, vec3 direction, Sphere sphere) {
    vec3 toSphere = origin - sphere.center;
    float a = dot(direction, direction);
    float b = 2.0 * dot(toSphere, direction);
    float c = dot(toSphere, toSphere) - sphere.radius * sphere.radius;
    float discriminant = b * b - 4.0 * a * c;
    if(discriminant > 0.0) {
        float t = (-b - sqrt(discriminant)) / (2.0 * a);
        if(t > 0.0)
            return t;
    }
    return INFINITY + 1.0;
}
vec2 intersectCube(vec3 origin, vec3 ray, Cube cube) {
    vec3 tMin = (cube.minCorner - origin) / ray;
    vec3 tMax = (cube.maxCorner - origin) / ray;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    float tNear = max(max(t1.x, t1.y), t1.z);
    float tFar = min(min(t2.x, t2.y), t2.z);
    return vec2(tNear, tFar);
}
vec3 colorOnRoom(vec3 position) {
    if(position.x < -0.9999) {
        return vec3(0.1, 0.5, 1.0);
    } else if(position.x > 0.9999) {
        return vec3(1.0, 0.9, 0.1);
    }
    return WHITE;
}
float random(vec3 scale, float seed) {
    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}
vec3 cosineWeightedDirection(float seed, vec3 normal) {
    float u = random(vec3(12.9898, 78.233, 151.7182), seed);
    float v = random(vec3(63.7264, 10.873, 623.6736), seed);
    float r = sqrt(u);
    float angle = 6.283185307179586 * v;
    vec3 sdir, tdir;
    if(abs(normal.x) < .5) {
        sdir = cross(normal, vec3(1, 0, 0));
    } else {
        sdir = cross(normal, vec3(0, 1, 0));
    }
    tdir = cross(normal, sdir);
    return r * cos(angle) * sdir + r * sin(angle) * tdir + sqrt(1. - u) * normal;
}
vec3 getNormalizedRandomDirection(float seed) {
    float x = random(vec3(12.9898, 78.233, 151.7182), seed);
    float y = random(vec3(63.7264, 10.873, 623.6736), seed);
    float z = random(vec3(36.7539, 50.368, 306.2759), seed);
    return normalize(vec3(x, y, z));
}
vec3 normalOfCube(vec3 point, Cube cube) {
    if(point.x < cube.minCorner.x + 0.0001) {
        return vec3(-1.0, 0.0, 0.0);
    } else if(point.x > cube.maxCorner.x - 0.0001) {
        return vec3(1.0, 0.0, 0.0);
    } else if(point.y < cube.minCorner.y + 0.0001) {
        return vec3(0.0, -1.0, 0.0);
    } else if(point.y > cube.maxCorner.y - 0.0001) {
        return vec3(0.0, 1.0, 0.0);
    } else if(point.z < cube.minCorner.z + 0.0001) {
        return vec3(0.0, 0.0, -1.0);
    } else {
        return vec3(0.0, 0.0, 1.0);
    }
}
vec3 normalOfSphere(vec3 point, Sphere sphere) {
    return normalize(point - sphere.center);
}
float shadow(vec3 origin, vec3 ray) {
    float tSphere1 = intersectSphere(origin, ray, s1);
    if(tSphere1 < 1.0)
        return 0.0;
    float tSphere2 = intersectSphere(origin, ray, s2);
    if(tSphere2 < 1.0)
        return 0.0;
    float tSphere3 = intersectSphere(origin, ray, s3);
    if(tSphere3 < 1.0)
        return 0.0;
    float tSphere4 = intersectSphere(origin, ray, s4);
    if(tSphere4 < 1.0)
        return 0.0;
    return 1.0;
}
vec3 calculateColor(vec3 origin, vec3 direction, float seed) {
    vec3 accumulatedColor = vec3(0.0);
    vec3 colorMask = vec3(1.0);
    for(int bounce = 0; bounce < MAX_BOUNCE; bounce++) {
        float t = INFINITY + 1.0;
        vec2 tRoom = intersectCube(origin, direction, room);
        float tSphere1 = intersectSphere(origin, direction, s1);
        float tSphere2 = intersectSphere(origin, direction, s2);
        float tSphere3 = intersectSphere(origin, direction, s3);
        float tSphere4 = intersectSphere(origin, direction, s4);
        if(tRoom.x < tRoom.y)
            t = tRoom.y;
        if(t > tSphere1)
            t = tSphere1;
        if(t > tSphere2)
            t = tSphere2;
        if(t > tSphere3)
            t = tSphere3;
        if(t > tSphere4)
            t = tSphere4;
        if(t > INFINITY) {
            accumulatedColor += SCENE_COLOR;
            break;
        }
        vec3 hitPoint = origin + t * direction;
        vec3 normal;
        vec3 surfaceColor = WHITE;
        float specularHighlight = 0.0;
        if(t == tRoom.y) {
            normal = -normalOfCube(hitPoint, room);
            surfaceColor = colorOnRoom(hitPoint);
        }
        if(t == tSphere1)
            normal = normalOfSphere(hitPoint, s1);
        if(t == tSphere2)
            normal = normalOfSphere(hitPoint, s2);
        if(t == tSphere3)
            normal = normalOfSphere(hitPoint, s3);
        if(t == tSphere4)
            normal = normalOfSphere(hitPoint, s4);
        origin = hitPoint;
        if(false) {
        } else if(t == tSphere1) {
            direction = cosineWeightedDirection(seed, normal);
        } else if(t == tSphere2) {
            direction = reflect(direction, normal);
            vec3 reflectedLight = normalize(reflect(light.position - hitPoint, normal));
            specularHighlight = max(0.0, dot(reflectedLight, normalize(hitPoint - origin)));
            specularHighlight = 2.0 * pow(specularHighlight, 20.0);
        } else if(t == tSphere3) {
            direction = normalize(reflect(direction, normal)) + getNormalizedRandomDirection(seed) * 0.6;
            vec3 reflectedLight = normalize(reflect(light.position - hitPoint, normal));
            specularHighlight = max(0.0, dot(reflectedLight, normalize(hitPoint - origin)));
            specularHighlight = pow(specularHighlight, 3.0);
        } else if(t == tSphere4) {
            direction = cosineWeightedDirection(seed, normal);
        } else {
            direction = cosineWeightedDirection(seed, normal);
        }
        if(dot(normal, direction) < 0.0) {
            direction = -direction;
        }
        vec3 toLight = light.position - hitPoint;
        float diffuse = max(0.0, dot(normalize(toLight), normal));
        float shadowIntensity = shadow(hitPoint + normal * 0.0001, toLight);
        colorMask *= surfaceColor;
        accumulatedColor += (colorMask * (0.5 * diffuse * shadowIntensity)) * 0.6;
        accumulatedColor += (colorMask * specularHighlight * shadowIntensity) * 0.6;
    }
    return accumulatedColor;
}
void main() {
    light.position += getNormalizedRandomDirection(seed) * light.lightSize;
    vec3 sumColor = vec3(0.0);
    for(int i = 0; i < SAMPLE_NUM; i++) {
        sumColor = sumColor + calculateColor(eye, initialRay, seed);
        seed += 1.4732648392;
    }
    gl_FragColor = vec4(sumColor / float(SAMPLE_NUM), 1.0);
}