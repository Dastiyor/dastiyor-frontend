// k6 load test for the public browse flow (hot path: task feed + task detail).
// Run:  k6 run k6/load-test.js
//       k6 run -e BASE_URL=http://localhost:3000 -e VUS=20 k6/load-test.js
// Target a local `pnpm dev`/`next start` — do NOT point this at production.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
    stages: [
        { duration: '30s', target: Number(__ENV.VUS) || 20 }, // ramp up
        { duration: '1m', target: Number(__ENV.VUS) || 20 },  // hold
        { duration: '15s', target: 0 },                       // ramp down
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<800'],
    },
};

// ponytail: unique fake IP per VU so the per-IP rate limiter (100/min) doesn't
// throttle the test. Only works locally — Vercel overwrites x-forwarded-for.
function params() {
    return { headers: { 'x-forwarded-for': `10.0.${(__VU >> 8) & 255}.${__VU & 255}` } };
}

export default function () {
    // Landing page
    let res = http.get(`${BASE_URL}/`, params());
    check(res, { 'landing 200': (r) => r.status === 200 });

    // Task feed (page 1)
    res = http.get(`${BASE_URL}/api/tasks?page=1`, params());
    check(res, { 'tasks 200': (r) => r.status === 200 });

    // Task detail for the first task, if any
    const tasks = res.status === 200 ? (res.json('tasks') || res.json()) : [];
    const first = Array.isArray(tasks) && tasks.length ? tasks[0] : null;
    if (first && first.id) {
        res = http.get(`${BASE_URL}/api/tasks/${first.id}`, params());
        check(res, { 'task detail 200': (r) => r.status === 200 });
    }

    // Search
    res = http.get(`${BASE_URL}/api/tasks?query=${encodeURIComponent('ремонт')}`, params());
    check(res, { 'search 200': (r) => r.status === 200 });

    sleep(1); // think time
}
