/**
 * Backend API Server for UOS College of Administration & Economics
 * Attendance System connected to Firebase Firestore (uosattendance-df9e3)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Load environment variables from .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...vals] = trimmed.split('=');
            if (key) process.env[key.trim()] = vals.join('=').trim();
        }
    });
}

const PORT = process.env.PORT || 3000;
const FIREBASE_CONFIG = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyANVRIF0xQ0-FkkJrbiDU5FAc5qYTDbVZE",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "uosattendance-df9e3.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "uosattendance-df9e3",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "uosattendance-df9e3.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "512431536760",
    appId: process.env.FIREBASE_APP_ID || "1:512431536760:web:399c39d8ec3dffe97f4b8d",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-L9CZS81LLE"
};

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

// Helper: Firestore REST converter
function toFirestoreFields(obj) {
    const fields = {};
    for (const [key, val] of Object.entries(obj)) {
        if (val === null || val === undefined) {
            fields[key] = { nullValue: null };
        } else if (typeof val === 'string') {
            fields[key] = { stringValue: val };
        } else if (typeof val === 'number') {
            if (Number.isInteger(val)) {
                fields[key] = { integerValue: String(val) };
            } else {
                fields[key] = { doubleValue: val };
            }
        } else if (typeof val === 'boolean') {
            fields[key] = { booleanValue: val };
        } else if (Array.isArray(val)) {
            fields[key] = {
                arrayValue: {
                    values: val.map(item => {
                        if (typeof item === 'object') return { mapValue: { fields: toFirestoreFields(item) } };
                        return { stringValue: String(item) };
                    })
                }
            };
        } else if (typeof val === 'object') {
            fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
        }
    }
    return fields;
}

function fromFirestoreFields(fields) {
    if (!fields) return {};
    const obj = {};
    for (const [key, val] of Object.entries(fields)) {
        if ('stringValue' in val) obj[key] = val.stringValue;
        else if ('integerValue' in val) obj[key] = parseInt(val.integerValue, 10);
        else if ('doubleValue' in val) obj[key] = parseFloat(val.doubleValue);
        else if ('booleanValue' in val) obj[key] = val.booleanValue;
        else if ('nullValue' in val) obj[key] = null;
        else if ('mapValue' in val) obj[key] = fromFirestoreFields(val.mapValue.fields);
        else if ('arrayValue' in val) {
            obj[key] = (val.arrayValue.values || []).map(item => {
                if ('mapValue' in item) return fromFirestoreFields(item.mapValue.fields);
                if ('stringValue' in item) return item.stringValue;
                if ('integerValue' in item) return parseInt(item.integerValue, 10);
                return item;
            });
        }
    }
    return obj;
}

// REST Client functions for Firestore
async function getFirestoreDocuments(collectionName) {
    let allDocs = [];
    let pageToken = '';
    do {
        let url = `${FIRESTORE_BASE_URL}/${collectionName}?key=${FIREBASE_CONFIG.apiKey}&pageSize=300`;
        if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
        const res = await fetch(url);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Firestore GET failed [${res.status}]: ${text}`);
        }
        const data = await res.json();
        if (data.documents && data.documents.length) {
            const items = data.documents.map(doc => {
                const item = fromFirestoreFields(doc.fields);
                const nameParts = doc.name.split('/');
                item._id = nameParts[nameParts.length - 1];
                return item;
            });
            allDocs = allDocs.concat(items);
        }
        pageToken = data.nextPageToken || '';
    } while (pageToken);
    return allDocs;
}

async function setFirestoreDocument(collectionName, docId, data) {
    const url = `${FIRESTORE_BASE_URL}/${collectionName}/${encodeURIComponent(docId)}?key=${FIREBASE_CONFIG.apiKey}`;
    const fields = toFirestoreFields(data);
    const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Firestore PATCH failed [${res.status}]: ${text}`);
    }
    return await res.json();
}

async function deleteFirestoreDocument(collectionName, docId) {
    const url = `${FIRESTORE_BASE_URL}/${collectionName}/${encodeURIComponent(docId)}?key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Firestore DELETE failed [${res.status}]: ${text}`);
    }
    return true;
}

// MIME types dictionary for static files
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

// HTTP Request Handler
const server = http.createServer(async (req, res) => {
    // Enable CORS for API & cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Helper: read request body
    function getRequestBody() {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch (e) {
                    reject(e);
                }
            });
            req.on('error', reject);
        });
    }

    // Helper: JSON response
    function sendJson(statusCode, data) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
    }

    // ----------------------------------------------------
    // API ROUTING
    // ----------------------------------------------------
    if (pathname.startsWith('/api/')) {
        try {
            // 1. Health check & status
            if (pathname === '/api/status' && req.method === 'GET') {
                return sendJson(200, {
                    success: true,
                    status: 'online',
                    timestamp: new Date().toISOString(),
                    college: 'کۆلێژی کارگێڕی و ئابووری',
                    university: 'University of Sulaimani',
                    firebase: {
                        projectId: FIREBASE_CONFIG.projectId,
                        authDomain: FIREBASE_CONFIG.authDomain,
                        status: 'connected'
                    }
                });
            }

            // 2. Firebase Public Config
            if (pathname === '/api/config' && req.method === 'GET') {
                return sendJson(200, FIREBASE_CONFIG);
            }

            // 3. Students API
            if (pathname === '/api/students') {
                if (req.method === 'GET') {
                    const students = await getFirestoreDocuments('students');
                    return sendJson(200, { success: true, count: students.length, data: students });
                }
                if (req.method === 'POST') {
                    const body = await getRequestBody();
                    const studentId = body.id || String(Date.now());
                    body.id = String(studentId);
                    await setFirestoreDocument('students', studentId, body);
                    return sendJson(201, { success: true, message: 'Student saved to Firebase', student: body });
                }
                if (req.method === 'DELETE') {
                    // Wipe all students (used in End of Academic Year)
                    const students = await getFirestoreDocuments('students');
                    for (const s of students) {
                        const id = s.id || s._id;
                        if (id) await deleteFirestoreDocument('students', id);
                    }
                    return sendJson(200, { success: true, message: 'All students wiped from Firebase', deletedCount: students.length });
                }
            }

            // 4. Single Student Delete/Update: /api/students/:id
            if (pathname.startsWith('/api/students/')) {
                const id = pathname.replace('/api/students/', '');
                if (req.method === 'DELETE') {
                    await deleteFirestoreDocument('students', id);
                    return sendJson(200, { success: true, message: `Student ${id} deleted` });
                }
                if (req.method === 'PUT') {
                    const body = await getRequestBody();
                    body.id = String(id);
                    await setFirestoreDocument('students', id, body);
                    return sendJson(200, { success: true, message: `Student ${id} updated`, data: body });
                }
            }

            // 5. Attendance Sessions API
            if (pathname === '/api/sessions') {
                if (req.method === 'GET') {
                    const sessions = await getFirestoreDocuments('attendance_sessions');
                    return sendJson(200, { success: true, count: sessions.length, data: sessions });
                }
                if (req.method === 'POST') {
                    const body = await getRequestBody();
                    const sessId = body.id || ('sess_' + Date.now());
                    body.id = sessId;
                    await setFirestoreDocument('attendance_sessions', sessId, body);
                    return sendJson(201, { success: true, message: 'Session saved to Firebase', session: body });
                }
                if (req.method === 'DELETE') {
                    const sessions = await getFirestoreDocuments('attendance_sessions');
                    for (const sess of sessions) {
                        const id = sess.id || sess._id;
                        if (id) await deleteFirestoreDocument('attendance_sessions', id);
                    }
                    return sendJson(200, { success: true, message: 'All sessions wiped from Firebase', deletedCount: sessions.length });
                }
            }

            // 6. Courses API
            if (pathname === '/api/courses') {
                if (req.method === 'GET') {
                    const courses = await getFirestoreDocuments('courses');
                    return sendJson(200, { success: true, count: courses.length, data: courses });
                }
                if (req.method === 'POST') {
                    const body = await getRequestBody();
                    const courseId = body.id || ('crs_' + Date.now());
                    body.id = courseId;
                    await setFirestoreDocument('courses', courseId, body);
                    return sendJson(201, { success: true, message: 'Course saved to Firebase', course: body });
                }
            }

            // 7. Full Bulk Sync API: /api/sync
            if (pathname === '/api/sync' && req.method === 'POST') {
                const body = await getRequestBody();
                const { students, courses, sessions, auditLogs } = body;
                let pushedStudents = 0;
                let pushedSessions = 0;

                if (Array.isArray(students)) {
                    for (const stu of students) {
                        if (stu && stu.id) {
                            await setFirestoreDocument('students', String(stu.id), stu);
                            pushedStudents++;
                        }
                    }
                }

                if (Array.isArray(sessions)) {
                    for (const sess of sessions) {
                        if (sess && sess.id) {
                            await setFirestoreDocument('attendance_sessions', String(sess.id), sess);
                            pushedSessions++;
                        }
                    }
                }

                return sendJson(200, {
                    success: true,
                    message: 'Full sync completed successfully',
                    pushedStudents,
                    pushedSessions
                });
            }

            // 8. End of Semester Command: /api/reset-semester
            if (pathname === '/api/reset-semester' && req.method === 'POST') {
                // Set all student absent hours to 0 and clear sessions
                const students = await getFirestoreDocuments('students');
                for (const stu of students) {
                    stu.absentHours = 0;
                    await setFirestoreDocument('students', String(stu.id || stu._id), stu);
                }
                const sessions = await getFirestoreDocuments('attendance_sessions');
                for (const s of sessions) {
                    await deleteFirestoreDocument('attendance_sessions', String(s.id || s._id));
                }
                return sendJson(200, {
                    success: true,
                    message: 'کۆتایی هاتنی سمستەر: سەرجەم غیاباتەکان سفرکرانەوە و خوێندکاران مانەوە.',
                    resetStudentCount: students.length
                });
            }

            // 9. End of Academic Year Command: /api/reset-academic-year
            if (pathname === '/api/reset-academic-year' && req.method === 'POST') {
                // Wipe all students and wipe all sessions
                const students = await getFirestoreDocuments('students');
                for (const stu of students) {
                    await deleteFirestoreDocument('students', String(stu.id || stu._id));
                }
                const sessions = await getFirestoreDocuments('attendance_sessions');
                for (const s of sessions) {
                    await deleteFirestoreDocument('attendance_sessions', String(s.id || s._id));
                }
                return sendJson(200, {
                    success: true,
                    message: 'کۆتایی هاتنی ساڵی خوێندن: سەرجەم خوێندکاران و دانیشتنەکان لە فایەربەیس سڕانەوە بۆ ساڵی نوێ.',
                    deletedStudentCount: students.length
                });
            }

            return sendJson(404, { success: false, error: 'API route not found' });
        } catch (apiError) {
            console.error('[API Error]', apiError);
            return sendJson(500, { success: false, error: apiError.message });
        }
    }

    // ----------------------------------------------------
    // STATIC FILE SERVING
    // ----------------------------------------------------
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    
    // Security check to avoid directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Access Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Check if adding .html helps (e.g. /login -> /login.html)
            if (fs.existsSync(filePath + '.html')) {
                filePath = filePath + '.html';
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found - پەڕەکە نەدۆزرایەوە');
                return;
            }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('500 Internal Server Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        });
    });
});

server.listen(PORT, () => {
    console.log('================================================================');
    console.log(`🚀 UOS Attendance Backend Server is RUNNING!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔥 Firebase Project: ${FIREBASE_CONFIG.projectId}`);
    console.log(`🌐 System Portal: http://localhost:${PORT}/index.html`);
    console.log(`👑 Super Admin:   http://localhost:${PORT}/super_admin.html`);
    console.log(`🏢 Departments:   http://localhost:${PORT}/departments.html`);
    console.log(`👨‍🏫 Teacher Portal: http://localhost:${PORT}/teacher_attendance.html`);
    console.log(`🔐 Login:          http://localhost:${PORT}/login.html`);
    console.log('================================================================');
});
