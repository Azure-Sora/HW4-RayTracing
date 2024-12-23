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
//material
//1:Diffuse
//2:Reflective
//3:Glossy
struct Cube {
    vec3 minCorner;
    vec3 maxCorner;
    int material;
};
struct Sphere {
    vec3 center;
    float radius;
    int material;
};
struct Ray {
    vec3 origin;
    vec3 direction;
    int bounceNum;
};
struct LightSource {
    vec3 position;
    float intensity;
    float lightSize;
};
Cube room = Cube(vec3(-1.0, -1.0, -1.0), vec3(1.0, 1.0, 1.0), 1);
LightSource light = LightSource(vec3(0.0, 0.8, 0.0), 0.8, 0.2);

Cube c1 = Cube(vec3(0.3, -1.0, 0.3), vec3(0.6, 0.0, 0.9), 1);
Cube c2 = Cube(vec3(-0.9, -0.4, -0.5), vec3(0.6, 0.6, -0.1), 1);
Sphere s1 = Sphere(vec3(0.6, 0.0, 0.0), 0.4, 1);
Sphere s2 = Sphere(vec3(-0.3, -0.6, 0.6), 0.4, 1);

// 光线与球相交
// 如果相交，则origin + t * direction就是交点的位置
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

// 获取当前点的漫反射光强
// 如果与光源之间有阻隔，就返回0
float getDiffuseIntensity(vec3 point, vec3 normal, LightSource lightSource) {
    vec3 toLightSource = lightSource.position - point;
    float t = INFINITY + 1.0;
    vec2 tRoom = intersectCube(point, toLightSource, room);
    float tSphere1 = intersectSphere(point, toLightSource, s1);
    float tSphere2 = intersectSphere(point, toLightSource, s2);
    vec2 tCube1 = intersectCube(point, toLightSource, c1);
    vec2 tCube2 = intersectCube(point, toLightSource, c2);
        // 找到t的最小值，就是最先相交的那一个
    if(tRoom.x < tRoom.y)
        t = tRoom.y;
    if(t > tSphere1)
        t = tSphere1;
    if(t > tSphere2)
        t = tSphere2;
    if(tCube1.x > 0.0 && tCube1.x < tCube1.y && tCube1.x < t)
        t = tCube1.x;
    if(tCube2.x > 0.0 && tCube2.x < tCube2.y && tCube2.x < t)
        t = tCube2.x;
    if(t < 1.0) {
        // 说明从point到lightSource.positon的路径上有阻挡
        return 0.0;
    } else {
        // 根据角度的不同光强也不同。
        // 可能夹角大于90°，就说明在背面，返回0
        return max(0.0, dot(normalize(toLightSource), normal)) * light.intensity;
    }
}

float random(vec3 scale, float seed) {
    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

// 网上找的一个随机取样算法，效果不错
// random cosine-weighted distributed vector
// from http://www.rorydriscoll.com/2009/01/07/better-sampling/
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

// 这个是我自己写的漫反射时随机取方向算法，但是效果不如上面那个网上找的
vec3 getNormalizedRandomDirection(float seed) {
    float x = random(vec3(12.9898, 78.233, 151.7182), seed);
    float y = random(vec3(63.7264, 10.873, 623.6736), seed);
    float z = random(vec3(36.7539, 50.368, 306.2759), seed);
    return normalize(vec3(x, y, z));
}

// cube的法线，全部指向外
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
    vec2 tCube1 = intersectCube(origin, ray, c1);
    if(tCube1.x > 0.0 && tCube1.x < 1.0 && tCube1.x < tCube1.y) {
        return 0.0;
    }
    vec2 tCube2 = intersectCube(origin, ray, c2);
    if(tCube2.x > 0.0 && tCube2.x < 1.0 && tCube2.x < tCube2.y) {
        return 0.0;
    }
    float tSphere1 = intersectSphere(origin, ray, s1);
    if(tSphere1 < 1.0)
        return 0.0;
    return 1.0;
}

// 其实最好用递归写法，但是GLSL不允许递归
vec3 calculateColor(vec3 origin, vec3 direction, float seed) {
    vec3 accumulatedColor = vec3(0.0);
    // colorMask机制较为复杂，请查看文档
    vec3 colorMask = vec3(1.0);
    for(int bounce = 0; bounce < MAX_BOUNCE; bounce++) {
        // origin + t * direction 就是交点的位置
        float t = INFINITY + 1.0;
        vec2 tRoom = intersectCube(origin, direction, room);
        float tSphere1 = intersectSphere(origin, direction, s1);
        float tSphere2 = intersectSphere(origin, direction, s2);
        vec2 tCube1 = intersectCube(origin, direction, c1);
        vec2 tCube2 = intersectCube(origin, direction, c2);
        // 找到t的最小值，就是最先相交的那一个
        if(tRoom.x < tRoom.y)
            t = tRoom.y;
        if(t > tSphere1)
            t = tSphere1;
        if(t > tSphere2)
            t = tSphere2;
        if(tCube1.x > 0.0 && tCube1.x < tCube1.y && tCube1.x < t)
            t = tCube1.x;
        if(tCube2.x > 0.0 && tCube2.x < tCube2.y && tCube2.x < t)
            t = tCube2.x;
        if(t > INFINITY) {
            // 说明光线没有与任何物体相交
            accumulatedColor += SCENE_COLOR;
            break;
        }
        vec3 hitPoint = origin + t * direction;
        vec3 normal;
        vec3 surfaceColor = WHITE;
        float specularHighlight = 0.0;
        // 计算法线
        if(t == tRoom.y) {
            normal = -normalOfCube(hitPoint, room); // 这里一定是从内向外碰到了room，因此法线反向
            surfaceColor = colorOnRoom(hitPoint);
        } else if(t == tSphere1) {
            normal = normalOfSphere(hitPoint, s1);
        } else if(t == tSphere2) {
            normal = normalOfSphere(hitPoint, s2);
        } else if(t == tCube1.x && tCube1.x < tCube1.y) {
            normal = normalOfCube(hitPoint, c1);
        } else if(t == tCube2.x && tCube2.x < tCube2.y) {
            normal = normalOfCube(hitPoint, c2);
        }
        // 计算漫反射光照。如果有遮挡，会返回0.0

        // 更新光线的起点、方向，累加颜色
        origin = hitPoint;
        float absorptivity = 0.0; // 当前材质吸收多少光

        if(t == tSphere2 || (t == tCube2.x && tCube2.x < tCube2.y)) {
            // 不锈钢材质，下一条光线用镜面反射计算
            // 这里应该按照某种概率随即在镜面反射和漫反射之间选取
            // 但是由于实在没有什么好的随机算法就索性直接镜面反射了
            // direction = reflect(direction, normal);
            // absorptivity = 0.3;
            direction = reflect(direction, normal);
            vec3 reflectedLight = normalize(reflect(light.position - hitPoint, normal));
            specularHighlight = max(0.0, dot(reflectedLight, normalize(hitPoint - origin)));
            specularHighlight = 2.0 * pow(specularHighlight, 20.0);

        } else {
            // 模糊材质，下一条光线用漫散射计算
            direction = cosineWeightedDirection(seed, normal);
            //absorptivity = 0.7;
        }
        if(dot(normal, direction) < 0.0) {
            // 保证direction和normal的方向在同一半球
            direction = -direction;
        }
        // colorMask *= surfaceColor;
        // accumulatedColor += colorMask * (1.0 - absorptivity) * diffuseIntensity;
        vec3 toLight = light.position - hitPoint;
        float diffuse = max(0.0, dot(normalize(toLight), normal));
        float shadowIntensity = shadow(hitPoint + normal * 0.0001, toLight);
        colorMask *= surfaceColor;
        accumulatedColor += (colorMask * (0.5 * diffuse * shadowIntensity)) * 0.6;
        accumulatedColor += (colorMask * specularHighlight * shadowIntensity) * 0.6;

    }

    return accumulatedColor;
}

// 给光源一个大小，实际上就是每像素都随机的把光源位置偏移一下
// ，偏移的长度等于lightSize. 用来实现软阴影
void main() {
    light.position += getNormalizedRandomDirection(seed) * light.lightSize;
    vec3 sumColor = vec3(0.0);
    for(int i = 0; i < SAMPLE_NUM; i++) {
        sumColor = sumColor + calculateColor(eye, initialRay, seed);
        seed += 1.4732648392;
    }
    gl_FragColor = vec4(sumColor / float(SAMPLE_NUM), 1.0);
}