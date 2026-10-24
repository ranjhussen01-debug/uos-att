/**
 * Firebase Realtime Sync Service for Attendance System
 * Project: uosattendance-df9e3
 * University of Sulaimani - College of Administration and Economics
 */

(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyANVRIF0xQ0-FkkJrbiDU5FAc5qYTDbVZE",
        authDomain: "uosattendance-df9e3.firebaseapp.com",
        projectId: "uosattendance-df9e3",
        storageBucket: "uosattendance-df9e3.firebasestorage.app",
        messagingSenderId: "512431536760",
        appId: "1:512431536760:web:399c39d8ec3dffe97f4b8d",
        measurementId: "G-L9CZS81LLE"
    };

    let app = null;
    let db = null;
    let isConnected = false;
    let isSyncing = false;
    let lastSyncTime = null;
    let syncListeners = [];

    // Initialize Firebase SDK
    function initFirebase() {
        if (typeof firebase === 'undefined') {
            console.warn('[Firebase] Firebase SDK is not loaded in this window yet.');
            renderStatusBadge('error', 'SDK ئامادە نییە');
            return false;
        }

        try {
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app();
            }

            db = firebase.firestore();

            // Enable offline persistence if supported
            try {
                db.enablePersistence({ synchronizeTabs: true }).catch(err => {
                    if (err.code === 'failed-precondition') {
                        console.log('[Firebase] Persistence failed: Multiple tabs open');
                    } else if (err.code === 'unimplemented') {
                        console.log('[Firebase] Persistence not supported by browser');
                    }
                });
            } catch (e) {
                // Ignore persistence errors
            }

            isConnected = true;
            console.log('[Firebase] Successfully connected to project:', firebaseConfig.projectId);
            renderStatusBadge('connected', 'پەیوەستە بە فایەربەیس');
            
            // Initial sync & Real-time listeners setup
            setupRealtimeSync();
            return true;
        } catch (error) {
            console.error('[Firebase] Initialization error:', error);
            isConnected = false;
            renderStatusBadge('error', 'هەڵە لە پەیوەستبوون');
            return false;
        }
    }

    // Set up real-time listeners for students and sessions
    function setupRealtimeSync() {
        if (!db) return;

        // Check if remote has data or if we should perform initial seed
        const metaDocRef = db.collection('system_meta').doc('sync_state');

        metaDocRef.get().then(doc => {
            if (!doc.exists) {
                console.log('[Firebase] Remote database is empty. Uploading initial local data to cloud...');
                pushAllLocalToCloud(true);
            } else {
                console.log('[Firebase] Cloud data exists. Pulling latest cloud changes...');
                pullAllCloudToLocal();
            }
        }).catch(err => {
            console.warn('[Firebase] Could not read meta document, attempting initial pull:', err);
            pullAllCloudToLocal();
        });

        // Listen for Realtime Students changes
        try {
            db.collection('students').onSnapshot(snapshot => {
                if (snapshot.empty && !localStorage.getItem('college_students')) return;
                
                // If local is currently writing, don't self-overwrite immediately
                if (isSyncing) return;

                const remoteStudents = [];
                snapshot.forEach(doc => {
                    remoteStudents.push(doc.data());
                });

                if (remoteStudents.length > 0) {
                    const localRaw = localStorage.getItem('college_students');
                    const localStudents = localRaw ? JSON.parse(localRaw) : [];
                    
                    // Simple check if remote is different
                    if (JSON.stringify(remoteStudents) !== JSON.stringify(localStudents)) {
                        console.log('[Firebase] Realtime students update received from cloud:', remoteStudents.length);
                        localStorage.setItem('college_students', JSON.stringify(remoteStudents));
                        notifyLocalApp('students_updated', remoteStudents);
                    }
                }
                lastSyncTime = new Date();
                updateBadgeTooltip();
            }, err => {
                console.warn('[Firebase] Students realtime listener error:', err.message);
            });

            // Listen for Realtime Sessions changes
            db.collection('attendance_sessions').onSnapshot(snapshot => {
                if (isSyncing) return;

                const remoteSessions = [];
                snapshot.forEach(doc => {
                    remoteSessions.push(doc.data());
                });

                if (remoteSessions.length > 0) {
                    const localRaw = localStorage.getItem('college_attendance_sessions');
                    const localSessions = localRaw ? JSON.parse(localRaw) : [];

                    if (JSON.stringify(remoteSessions) !== JSON.stringify(localSessions)) {
                        console.log('[Firebase] Realtime sessions update received from cloud:', remoteSessions.length);
                        // Sort sessions by date/createdAt desc
                        remoteSessions.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                        localStorage.setItem('college_attendance_sessions', JSON.stringify(remoteSessions));
                        notifyLocalApp('sessions_updated', remoteSessions);
                    }
                }
                lastSyncTime = new Date();
                updateBadgeTooltip();
            }, err => {
                console.warn('[Firebase] Sessions realtime listener error:', err.message);
            });

            // Listen for Realtime Courses (Teachers/Subjects) changes
            db.collection('courses').onSnapshot(snapshot => {
                if (isSyncing) return;
                const remoteCourses = [];
                snapshot.forEach(doc => {
                    remoteCourses.push(doc.data());
                });

                if (remoteCourses.length > 0) {
                    const localRaw = localStorage.getItem('college_courses');
                    const localCourses = localRaw ? JSON.parse(localRaw) : [];
                    if (JSON.stringify(remoteCourses) !== JSON.stringify(localCourses)) {
                        console.log('[Firebase] Realtime courses update received from cloud:', remoteCourses.length);
                        localStorage.setItem('college_courses', JSON.stringify(remoteCourses));
                        syncCoursesToAuthUsers(remoteCourses);
                        notifyLocalApp('courses_updated', remoteCourses);
                    }
                }
            }, err => {
                console.warn('[Firebase] Courses realtime listener error:', err.message);
            });

            // Listen for Realtime Users (Auth Accounts) changes
            db.collection('users').onSnapshot(snapshot => {
                if (isSyncing) return;
                const remoteUsers = [];
                snapshot.forEach(doc => {
                    remoteUsers.push(doc.data());
                });

                if (remoteUsers.length > 0) {
                    let localUsers = JSON.parse(localStorage.getItem('college_auth_users') || '[]');
                    let changed = false;
                    remoteUsers.forEach(ru => {
                        const idx = localUsers.findIndex(u => u.username && u.username.toLowerCase() === (ru.username || '').toLowerCase());
                        if (idx >= 0) {
                            if (JSON.stringify(localUsers[idx]) !== JSON.stringify(ru)) {
                                localUsers[idx] = Object.assign(localUsers[idx], ru);
                                changed = true;
                            }
                        } else {
                            localUsers.push(ru);
                            changed = true;
                        }
                    });
                    if (changed) {
                        localStorage.setItem('college_auth_users', JSON.stringify(localUsers));
                        notifyLocalApp('users_updated', localUsers);
                    }
                }
            }, err => {
                console.warn('[Firebase] Users realtime listener error:', err.message);
            });

        } catch (e) {
            console.error('[Firebase] Error setting up listeners:', e);
        }
    }

    // Helper: Map all courses to auth accounts so every teacher can log in anywhere
    function syncCoursesToAuthUsers(crsList) {
        if (!Array.isArray(crsList)) return;
        try {
            let authUsers = JSON.parse(localStorage.getItem('college_auth_users') || '[]');
            crsList.forEach(c => {
                if (!c.username) return;
                const uName = String(c.username).trim().toLowerCase();
                const idx = authUsers.findIndex(u => u.username && u.username.toLowerCase() === uName);
                const userObj = {
                    username: uName,
                    password: c.password,
                    name: c.teacherName,
                    role: 'teacher',
                    deptId: c.deptId || c.dept || 'dept_accounting',
                    dept: c.deptId || c.dept || 'dept_accounting',
                    subject: c.subject,
                    stage: String(c.stage || '1'),
                    totalHours: parseInt(c.totalHours) || 60,
                    avatarColor: 'indigo'
                };
                if (idx >= 0) {
                    authUsers[idx] = Object.assign(authUsers[idx], userObj);
                } else {
                    authUsers.push(userObj);
                }
            });
            localStorage.setItem('college_auth_users', JSON.stringify(authUsers));
        } catch(e) {
            console.warn('[Firebase] syncCoursesToAuthUsers error:', e);
        }
    }

    // Pull all data from cloud to local
    async function pullAllCloudToLocal() {
        if (!db) return;
        try {
            setSyncingState(true);

            // Pull students
            const stuSnap = await db.collection('students').get();
            if (!stuSnap.empty) {
                const stuList = [];
                stuSnap.forEach(d => stuList.push(d.data()));
                localStorage.setItem('college_students', JSON.stringify(stuList));
                notifyLocalApp('students_updated', stuList);
            }

            // Pull courses
            const crsSnap = await db.collection('courses').get();
            if (!crsSnap.empty) {
                const crsList = [];
                crsSnap.forEach(d => crsList.push(d.data()));
                localStorage.setItem('college_courses', JSON.stringify(crsList));
                syncCoursesToAuthUsers(crsList);
                notifyLocalApp('courses_updated', crsList);
            }

            // Pull users
            const usersSnap = await db.collection('users').get();
            if (!usersSnap.empty) {
                let localUsers = JSON.parse(localStorage.getItem('college_auth_users') || '[]');
                usersSnap.forEach(d => {
                    const ru = d.data();
                    const idx = localUsers.findIndex(u => u.username && u.username.toLowerCase() === (ru.username || '').toLowerCase());
                    if (idx >= 0) localUsers[idx] = Object.assign(localUsers[idx], ru);
                    else localUsers.push(ru);
                });
                localStorage.setItem('college_auth_users', JSON.stringify(localUsers));
            }

            // Pull sessions
            const sessSnap = await db.collection('attendance_sessions').get();
            if (!sessSnap.empty) {
                const sessList = [];
                sessSnap.forEach(d => sessList.push(d.data()));
                sessList.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                localStorage.setItem('college_attendance_sessions', JSON.stringify(sessList));
                notifyLocalApp('sessions_updated', sessList);
            }

            // Pull audit logs
            const auditSnap = await db.collection('audit_logs').limit(100).get();
            if (!auditSnap.empty) {
                const auditList = [];
                auditSnap.forEach(d => auditList.push(d.data()));
                auditList.sort((a, b) => new Date(b.date) - new Date(a.date));
                localStorage.setItem('college_audit_logs', JSON.stringify(auditList));
            }

            lastSyncTime = new Date();
            renderStatusBadge('connected', 'هاوکاتکراوە (Sync Complete)');
        } catch (error) {
            console.error('[Firebase] Error pulling cloud data:', error);
            renderStatusBadge('warning', 'کێشە لە خوێندنەوەی کلاود');
        } finally {
            setSyncingState(false);
        }
    }

    // Push local data up to cloud (Students, Sessions, Courses, Users, Audit Logs)
    async function pushAllLocalToCloud(isInitial = false) {
        if (!db) return;
        try {
            setSyncingState(true);
            renderStatusBadge('syncing', 'داتاکان دەنێردرێنە فایەربەیس...');

            const localStudents = JSON.parse(localStorage.getItem('college_students') || '[]');
            const localCourses = JSON.parse(localStorage.getItem('college_courses') || '[]');
            const localSessions = JSON.parse(localStorage.getItem('college_attendance_sessions') || '[]');
            const localUsers = JSON.parse(localStorage.getItem('college_auth_users') || '[]');
            const localAudit = JSON.parse(localStorage.getItem('college_audit_logs') || '[]');

            // Save students in batch
            if (localStudents.length > 0) {
                const batch = db.batch();
                localStudents.forEach(stu => {
                    const idStr = String(stu.id);
                    const ref = db.collection('students').doc(idStr);
                    batch.set(ref, {
                        ...stu,
                        id: idStr,
                        stage: String(stu.stage || '1'),
                        dept: stu.dept || stu.deptId || 'dept_accounting',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                });
                await batch.commit();
            }

            // Save courses
            if (localCourses.length > 0) {
                const batchC = db.batch();
                localCourses.forEach(crs => {
                    const idStr = String(crs.id);
                    const ref = db.collection('courses').doc(idStr);
                    batchC.set(ref, {
                        ...crs,
                        dept: crs.dept || crs.deptId || 'dept_accounting',
                        deptId: crs.deptId || crs.dept || 'dept_accounting',
                        stage: String(crs.stage || '1')
                    }, { merge: true });
                });
                await batchC.commit();
            }

            // Save users
            if (localUsers.length > 0) {
                const batchU = db.batch();
                localUsers.forEach(u => {
                    if (!u.username) return;
                    const uRef = db.collection('users').doc(u.username.toLowerCase().trim());
                    batchU.set(uRef, {
                        ...u,
                        username: u.username.toLowerCase().trim(),
                        stage: String(u.stage || '1'),
                        deptId: u.deptId || u.dept || null
                    }, { merge: true });
                });
                await batchU.commit();
            }

            // Save sessions
            if (localSessions.length > 0) {
                const batchS = db.batch();
                // Take latest 150 sessions if too large
                localSessions.slice(0, 150).forEach(sess => {
                    const idStr = String(sess.id);
                    const ref = db.collection('attendance_sessions').doc(idStr);
                    batchS.set(ref, sess, { merge: true });
                });
                await batchS.commit();
            }

            // Update sync state
            await db.collection('system_meta').doc('sync_state').set({
                lastSyncedAt: firebase.firestore.FieldValue.serverTimestamp(),
                studentCount: localStudents.length,
                sessionCount: localSessions.length,
                syncedBy: (JSON.parse(localStorage.getItem('college_auth_user') || '{}').name) || 'سیستەم'
            }, { merge: true });

            lastSyncTime = new Date();
            renderStatusBadge('connected', 'پەیوەست و هاوکاتکراوە');
            console.log('[Firebase] Successfully pushed local dataset to Firebase Firestore.');
            return true;
        } catch (error) {
            console.error('[Firebase] Error pushing local to cloud:', error);
            renderStatusBadge('error', 'هەڵە لە ناردنی داتا');
            return false;
        } finally {
            setSyncingState(false);
        }
    }

    // Single student save
    async function saveStudent(student) {
        if (!student || !student.id) return;
        if (!db) return;
        try {
            const idStr = String(student.id);
            await db.collection('students').doc(idStr).set({
                ...student,
                id: idStr,
                stage: String(student.stage || '1'),
                dept: student.dept || student.deptId || 'dept_accounting',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log('[Firebase] Student synced to cloud:', student.name, 'Stage:', student.stage);
        } catch (e) {
            console.warn('[Firebase] Could not sync student:', e);
        }
    }

    // Single student delete
    async function deleteStudent(studentId) {
        if (!studentId || !db) return;
        try {
            await db.collection('students').doc(String(studentId)).delete();
            console.log('[Firebase] Student removed from cloud:', studentId);
        } catch (e) {
            console.warn('[Firebase] Could not delete student:', e);
        }
    }

    // Single course / teacher account save
    async function saveCourse(course) {
        if (!course || !course.id || !db) return;
        try {
            const idStr = String(course.id);
            const deptKey = course.deptId || course.dept || 'dept_accounting';
            const courseData = {
                ...course,
                id: idStr,
                dept: deptKey,
                deptId: deptKey,
                stage: String(course.stage || '1'),
                username: (course.username || '').toLowerCase().trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('courses').doc(idStr).set(courseData, { merge: true });
            
            // Also immediately register in users collection so login succeeds anywhere
            if (course.username) {
                const userObj = {
                    username: course.username.toLowerCase().trim(),
                    password: course.password,
                    name: course.teacherName,
                    role: 'teacher',
                    deptId: deptKey,
                    dept: deptKey,
                    subject: course.subject,
                    stage: String(course.stage || '1'),
                    totalHours: parseInt(course.totalHours) || 60,
                    avatarColor: 'indigo'
                };
                await db.collection('users').doc(course.username.toLowerCase().trim()).set(userObj, { merge: true });
            }
            console.log('[Firebase] Course and teacher account synced to cloud:', course.subject, course.teacherName);
        } catch (e) {
            console.warn('[Firebase] Could not save course to cloud:', e);
        }
    }

    // Single course delete
    async function deleteCourse(courseId) {
        if (!courseId || !db) return;
        try {
            await db.collection('courses').doc(String(courseId)).delete();
            console.log('[Firebase] Course deleted from cloud:', courseId);
        } catch (e) {
            console.warn('[Firebase] Could not delete course:', e);
        }
    }

    // Single user save (Superadmin or Dept Head or Teacher)
    async function saveUser(user) {
        if (!user || !user.username || !db) return;
        try {
            const uName = user.username.toLowerCase().trim();
            await db.collection('users').doc(uName).set({
                ...user,
                username: uName,
                stage: String(user.stage || '1'),
                deptId: user.deptId || user.dept || null
            }, { merge: true });
            console.log('[Firebase] User account synced to cloud:', uName);
        } catch (e) {
            console.warn('[Firebase] Could not save user:', e);
        }
    }

    // Single user delete
    async function deleteUser(username) {
        if (!username || !db) return;
        try {
            await db.collection('users').doc(String(username).toLowerCase().trim()).delete();
            console.log('[Firebase] User removed from cloud:', username);
        } catch (e) {
            console.warn('[Firebase] Could not delete user:', e);
        }
    }

    // Wipe all students in cloud (used for End of Academic Year)
    async function wipeAllStudents() {
        if (!db) return;
        try {
            setSyncingState(true);
            const snapshot = await db.collection('students').get();
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log('[Firebase] All students wiped in cloud for End of Academic Year.');
            renderStatusBadge('connected', 'تەواوی خوێندکاران سڕانەوە');
        } catch (e) {
            console.error('[Firebase] Error wiping students:', e);
        } finally {
            setSyncingState(false);
        }
    }

    // Save attendance session
    async function saveAttendanceSession(session) {
        if (!session || !session.id || !db) return;
        try {
            await db.collection('attendance_sessions').doc(String(session.id)).set(session);
            console.log('[Firebase] Attendance session synced to cloud:', session.subject);
        } catch (e) {
            console.warn('[Firebase] Could not save session:', e);
        }
    }

    // Wipe attendance sessions in cloud (used for End of Semester / Year)
    async function wipeAllAttendanceSessions() {
        if (!db) return;
        try {
            setSyncingState(true);
            const snapshot = await db.collection('attendance_sessions').get();
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log('[Firebase] Attendance sessions wiped in cloud.');
        } catch (e) {
            console.error('[Firebase] Error wiping sessions:', e);
        } finally {
            setSyncingState(false);
        }
    }

    // Save Audit log
    async function logAudit(action, user, deptName) {
        if (!db) return;
        try {
            const id = 'log_' + Date.now();
            await db.collection('audit_logs').doc(id).set({
                id,
                action,
                user: user || 'سیستەم',
                deptName: deptName || 'گشتی',
                date: new Date().toISOString()
            });
        } catch (e) {
            console.warn('[Firebase] Could not save audit log:', e);
        }
    }

    // Notify local application UI if render functions exist
    function notifyLocalApp(eventType, data) {
        try {
            // Update auth/course in teacher page if available
            if (typeof initAuthAndUser === 'function' && (eventType === 'courses_updated' || eventType === 'users_updated')) {
                initAuthAndUser();
            }

            // Check if page has render functions
            if (typeof renderAttendanceSheet === 'function') {
                if (eventType === 'students_updated' && Array.isArray(data)) {
                    if (typeof students !== 'undefined') students = data;
                }
                renderAttendanceSheet();
            }
            if (typeof renderSuperAdminView === 'function') {
                if (eventType === 'students_updated' && Array.isArray(data)) {
                    if (typeof students !== 'undefined') students = data;
                }
                renderSuperAdminView();
            }
            if (typeof renderDepartmentView === 'function') {
                renderDepartmentView();
            }
            if (typeof renderDeptCoursesTable === 'function') {
                renderDeptCoursesTable();
            }
            if (typeof renderDeptStudentsTable === 'function') {
                renderDeptStudentsTable();
            }
            if (typeof renderSessionsHistory === 'function') {
                renderSessionsHistory();
            }
        } catch (err) {
            console.warn('[Firebase] Notify local app error:', err);
        }

        // Call registered callbacks
        syncListeners.forEach(fn => {
            try { fn(eventType, data); } catch (e) {}
        });
    }

    // Automatic Interceptor for localStorage
    // When code calls localStorage.setItem('college_students', ...)
    // it automatically queues a background cloud push!
    let debounceTimer = null;
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
        originalSetItem.apply(this, arguments);

        if (['college_students', 'college_attendance_sessions', 'college_courses', 'college_audit_logs', 'college_auth_users'].includes(key)) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (db && !isSyncing) {
                    console.log(`[Firebase AutoSync] Change detected in ${key}. Syncing to Firestore...`);
                    pushAllLocalToCloud(false);
                }
            }, 1500);
        }
    };

    function setSyncingState(syncing) {
        isSyncing = syncing;
        const spinner = document.getElementById('firebaseSyncSpinner');
        if (spinner) {
            if (syncing) {
                spinner.classList.remove('hidden');
            } else {
                spinner.classList.add('hidden');
            }
        }
    }

    // Render Floating Status Badge
    function renderStatusBadge(status, label) {
        let badge = document.getElementById('firebaseStatusBadge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'firebaseStatusBadge';
            badge.className = 'fixed bottom-3 left-3 z-50 flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-xl text-[11px] sm:text-xs font-bold transition-all duration-300 hover:scale-105 cursor-pointer max-w-[90vw] select-none';
            badge.setAttribute('dir', 'rtl');
            badge.onclick = showSyncModal;
            document.body.appendChild(badge);
        }

        let dotColor = 'bg-emerald-400';
        let borderColor = 'border-emerald-500/30';
        let icon = 'fa-cloud';

        if (status === 'syncing') {
            dotColor = 'bg-amber-400 animate-spin';
            borderColor = 'border-amber-500/40';
            icon = 'fa-arrows-rotate';
        } else if (status === 'error') {
            dotColor = 'bg-rose-500';
            borderColor = 'border-rose-500/40';
            icon = 'fa-triangle-exclamation';
        } else if (status === 'warning') {
            dotColor = 'bg-orange-400';
            borderColor = 'border-orange-500/40';
            icon = 'fa-cloud-exclamation';
        }

        badge.innerHTML = `
            <div class="relative flex items-center justify-center">
                <span class="w-2.5 h-2.5 rounded-full ${dotColor}"></span>
                ${status === 'connected' ? '<span class="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75"></span>' : ''}
            </div>
            <i class="fa-solid ${icon} text-amber-400 text-sm"></i>
            <span class="text-slate-200">${label || 'فایەربەیس'}</span>
            <span id="firebaseSyncSpinner" class="hidden"><i class="fa-solid fa-spinner animate-spin text-amber-400 text-xs"></i></span>
        `;
    }

    function updateBadgeTooltip() {
        const badge = document.getElementById('firebaseStatusBadge');
        if (badge && lastSyncTime) {
            badge.title = `دواین هاوکاتکردن: ${lastSyncTime.toLocaleTimeString('ku-IQ')}\nپرۆژە: ${firebaseConfig.projectId}`;
        }
    }

    // Modal for details & manual force sync
    function showSyncModal() {
        if (typeof Swal === 'undefined') {
            alert(`Firebase Project: ${firebaseConfig.projectId}\nStatus: ${isConnected ? 'Connected' : 'Offline'}`);
            return;
        }

        const stuCount = (JSON.parse(localStorage.getItem('college_students') || '[]')).length;
        const sessCount = (JSON.parse(localStorage.getItem('college_attendance_sessions') || '[]')).length;

        Swal.fire({
            title: 'دۆخی داتابەیسی فایەربەیس (Firebase)',
            html: `
                <div class="text-right text-xs space-y-3 p-4 bg-slate-900 rounded-2xl border border-slate-700 text-slate-300">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span>ناوی پرۆژە (Project ID):</span>
                        <strong class="font-mono text-amber-400">${firebaseConfig.projectId}</strong>
                    </div>
                    <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span>دۆخی پەیوەندی:</span>
                        <span class="inline-flex items-center gap-1.5 ${isConnected ? 'text-emerald-400' : 'text-rose-400'} font-bold">
                            <span class="w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}"></span>
                            ${isConnected ? 'پەیوەستە بە کلاود' : 'پچڕاوە (ئۆفلاین)'}
                        </span>
                    </div>
                    <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span>خوێندکارانی ئامادەکراو بۆ کلاود:</span>
                        <strong class="text-white">${stuCount} خوێندکار</strong>
                    </div>
                    <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span>دانیشتنەکانی غیابات:</span>
                        <strong class="text-white">${sessCount} دانیشتن</strong>
                    </div>
                    <div class="flex items-center justify-between">
                        <span>دواین هاوکاتکردن:</span>
                        <span class="font-mono text-slate-400">${lastSyncTime ? lastSyncTime.toLocaleTimeString('ku-IQ') : 'تۆمارنەکراوە'}</span>
                    </div>
                </div>
                <p class="text-[11px] text-slate-400 mt-3 text-right">
                    سیستەمەکە لە هەر گۆڕانکارییەکدا (تۆمارکردنی غیابات، زیادکردنی خوێندکار، سڕینەوە) بە شێوەی خۆکار داتاکان دەباتە سەر فایەربەیس و لە هەموو ئامێرەکان ڕەنگ دەداتەوە.
                </p>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-arrows-rotate ml-1.5"></i> هاوکاتکردنی دەستبەجێ (Force Sync)',
            cancelButtonText: 'داخستن',
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#475569',
            background: '#0b1120',
            color: '#f8fafc'
        }).then((result) => {
            if (result.isConfirmed) {
                pushAllLocalToCloud(false).then(ok => {
                    if (ok) {
                        Swal.fire({
                            icon: 'success',
                            title: 'هاوکاتکردن سەرکەوتووبوو!',
                            text: 'سەرجەم داتاکان ڕاستەوخۆ نێردران بۆ داتابەیسی فایەربەیس.',
                            confirmButtonColor: '#10b981',
                            background: '#0b1120',
                            color: '#f8fafc'
                        });
                    }
                });
            }
        });
    }

    // Auto initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFirebase);
    } else {
        initFirebase();
    }

    // Export to global scope
    window.FirebaseService = {
        config: firebaseConfig,
        init: initFirebase,
        getDb: () => db,
        isConnected: () => isConnected,
        pushAllToCloud: pushAllLocalToCloud,
        pullAllFromCloud: pullAllCloudToLocal,
        saveStudent,
        deleteStudent,
        saveCourse,
        deleteCourse,
        saveUser,
        deleteUser,
        wipeAllStudents,
        saveAttendanceSession,
        wipeAllAttendanceSessions,
        logAudit,
        showSyncModal,
        onSync: (fn) => syncListeners.push(fn)
    };
})();
