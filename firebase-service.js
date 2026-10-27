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
    let isQuotaExceeded = false;

    // Reset any old session quota lock to allow fresh user actions
    try {
        sessionStorage.removeItem('firebase_quota_exceeded');
    } catch (e) {}

    function handleFirestoreError(err, context) {
        if (!err) return false;
        const msg = String(err.message || '');
        if (err.code === 'resource-exhausted' || msg.includes('Quota exceeded') || msg.includes('quota')) {
            if (!isQuotaExceeded) {
                isQuotaExceeded = true;
                console.warn(`[Firebase] Quota limit reached (${context}). Switched batch sync to Local Storage Mode.`);
                renderStatusBadge('warning', 'دۆخی خۆجێیی بەردەستە (سیستەم کارایە)');
            }
            return true;
        }
        return false;
    }

    const DEFAULT_COURSES = [
        // بەشی ژمێریاری
        { id: 'crs_1', deptId: 'dept_accounting', dept: 'dept_accounting', subject: 'بنەماکانی ژمێریاری', teacherName: 'م. کاروان ئەحمەد', stage: '1', totalHours: 60, username: 'teacher', password: 'teacher123' },
        { id: 'crs_2', deptId: 'dept_accounting', dept: 'dept_accounting', subject: 'مافەکانی مرۆڤ', teacherName: 'م. شادان عوسمان', stage: '1', totalHours: 40, username: 'shadan_acc', password: 'shadan123' },
        { id: 'crs_3', deptId: 'dept_accounting', dept: 'dept_accounting', subject: 'ژمێریاری نەوت و گاز', teacherName: 'د. هێمن عومەر', stage: '2', totalHours: 60, username: 'hemin_acc', password: 'hemin123' },
        { id: 'crs_4', deptId: 'dept_accounting', dept: 'dept_accounting', subject: 'ژمێریاری تێچوون', teacherName: 'م. کامەران عەزیز', stage: '2', totalHours: 60, username: 'kamaran_acc', password: 'kamaran123' },
        { id: 'crs_5', deptId: 'dept_accounting', dept: 'dept_accounting', subject: 'ژمێریاری پێشکەوتوو', teacherName: 'د. فەرهاد حەمە', stage: '3', totalHours: 60, username: 'farhad_acc', password: 'farhad123' },
        { id: 'crs_6', deptId: 'dept_accounting', dept: 'dept_accounting', subject: 'وردبینی و پێداچوونەوە', teacherName: 'پ.د. سەردار عەلی', stage: '4', totalHours: 60, username: 'sardar_acc', password: 'sardar123' },

        // بەشی کارگێڕی کار
        { id: 'crs_7', deptId: 'dept_business', dept: 'dept_business', subject: 'پڕەنسیپەکانی کارگێڕی', teacherName: 'م. ڕێبوار کەمال', stage: '1', totalHours: 60, username: 'rebwar_bus', password: 'rebwar123' },
        { id: 'crs_8', deptId: 'dept_business', dept: 'dept_business', subject: 'زانستی کۆمپیوتەر', teacherName: 'م. هێرش جەمال', stage: '1', totalHours: 40, username: 'hersh_bus', password: 'hersh123' },
        { id: 'crs_9', deptId: 'dept_business', dept: 'dept_business', subject: 'بەڕێوەبردنی سەرچاوە مرۆییەکان', teacherName: 'د. نەوزاد ساڵح', stage: '2', totalHours: 60, username: 'nawzad_bus', password: 'nawzad123' },
        { id: 'crs_10', deptId: 'dept_business', dept: 'dept_business', subject: 'کارگێڕی ستراتیژی', teacherName: 'د. ڕەوەند بەکر', stage: '3', totalHours: 60, username: 'rawand_bus', password: 'rawand123' },
        { id: 'crs_11', deptId: 'dept_business', dept: 'dept_business', subject: 'کارگێڕی پرۆژەکان', teacherName: 'پ.د. ئاراس قادر', stage: '4', totalHours: 60, username: 'aras_bus', password: 'aras123' },

        // بەشی ئابووری
        { id: 'crs_12', deptId: 'dept_economics', dept: 'dept_economics', subject: 'مایکرۆ ئابووری', teacherName: 'د. شوان عەلی', stage: '1', totalHours: 60, username: 'shwan_econ', password: 'shwan123' },
        { id: 'crs_13', deptId: 'dept_economics', dept: 'dept_economics', subject: 'بیرکاری بۆ ئابووریناسان', teacherName: 'م. ئامانج مەجید', stage: '1', totalHours: 40, username: 'amanj_econ', password: 'amanj123' },
        { id: 'crs_14', deptId: 'dept_economics', dept: 'dept_economics', subject: 'ماکرۆ ئابووری', teacherName: 'د. سەرکەوت حوسێن', stage: '2', totalHours: 60, username: 'sarkawt_econ', password: 'sarkawt123' },
        { id: 'crs_15', deptId: 'dept_economics', dept: 'dept_economics', subject: 'ئابووری نێودەوڵەتی', teacherName: 'م. بێستوون فوئاد', stage: '3', totalHours: 60, username: 'bestun_econ', password: 'bestun123' },
        { id: 'crs_16', deptId: 'dept_economics', dept: 'dept_economics', subject: 'گەشەپێدانی ئابووری', teacherName: 'د. نەبەز عەبدوڵڵا', stage: '4', totalHours: 60, username: 'nabaz_econ', password: 'nabaz123' },

        // بەشی کارگێڕی بەبازاڕکردن
        { id: 'crs_17', deptId: 'dept_finance', dept: 'dept_finance', subject: 'بنەماکانی بەبازاڕکردن', teacherName: 'م. ئاری دارا', stage: '1', totalHours: 60, username: 'ari_fin', password: 'ari123' },
        { id: 'crs_18', deptId: 'dept_finance', dept: 'dept_finance', subject: 'پەیوەندییە گشتییەکان', teacherName: 'م. جوانۆ تەها', stage: '1', totalHours: 40, username: 'jwano_fin', password: 'jwano123' },
        { id: 'crs_19', deptId: 'dept_finance', dept: 'dept_finance', subject: 'ڕەفتاری بەکاربەر', teacherName: 'د. لاوان نەریمان', stage: '2', totalHours: 60, username: 'lawan_fin', password: 'lawan123' },
        { id: 'crs_20', deptId: 'dept_finance', dept: 'dept_finance', subject: 'بەبازاڕکردنی دیجیتاڵی', teacherName: 'م. دیلان تاریق', stage: '3', totalHours: 60, username: 'dilan_fin', password: 'dilan123' },
        { id: 'crs_21', deptId: 'dept_finance', dept: 'dept_finance', subject: 'ستراتیژی بەبازاڕکردن', teacherName: 'د. کاوە ئەحمەد', stage: '4', totalHours: 60, username: 'kawa_fin', password: 'kawa123' },

        // بەشی ئامار و زانیاری
        { id: 'crs_22', deptId: 'dept_statistics', dept: 'dept_statistics', subject: 'ئاماری سەرەتایی', teacherName: 'د. دانا جەمیل', stage: '1', totalHours: 60, username: 'dana_stat', password: 'dana123' },
        { id: 'crs_23', deptId: 'dept_statistics', dept: 'dept_statistics', subject: 'بیرکاری سەرەتایی', teacherName: 'م. دڵشاد فەتاح', stage: '1', totalHours: 40, username: 'dilshad_stat', password: 'dilshad123' },
        { id: 'crs_24', deptId: 'dept_statistics', dept: 'dept_statistics', subject: 'ئەگەرو گریمانە', teacherName: 'م. زانا حامید', stage: '2', totalHours: 60, username: 'zana_stat', password: 'zana123' },
        { id: 'crs_25', deptId: 'dept_statistics', dept: 'dept_statistics', subject: 'شیکاری ئاماری پێشکەوتوو', teacherName: 'د. شێرکۆ کەریم', stage: '3', totalHours: 60, username: 'sherko_stat', password: 'sherko123' },
        { id: 'crs_26', deptId: 'dept_statistics', dept: 'dept_statistics', subject: 'زنجیرەی کاتی', teacherName: 'پ.د. عەلی ڕەزا', stage: '4', totalHours: 60, username: 'ali_stat', password: 'ali123' }
    ];

    const BASE_SYSTEM_USERS = [
        { username: 'superadmin', password: 'admin123', name: 'سەرپەرشتیاری گشتی (سوپەر ئادمین)', role: 'superadmin', avatarColor: 'amber' },
        { username: 'accounting', password: 'acc123', name: 'بەڕێوەبەری بەشی ژمێریاری', role: 'department', deptId: 'dept_accounting', deptName: 'بەشی ژمێریاری', avatarColor: 'emerald' },
        { username: 'business', password: 'bus123', name: 'بەڕێوەبەری بەشی کارگێڕی کار', role: 'department', deptId: 'dept_business', deptName: 'بەشی کارگێڕی کار', avatarColor: 'blue' },
        { username: 'economics', password: 'econ123', name: 'بەڕێوەبەری بەشی ئابووری', role: 'department', deptId: 'dept_economics', deptName: 'بەشی ئابووری', avatarColor: 'purple' },
        { username: 'finance', password: 'fin123', name: 'بەڕێوەبەری بەشی کارگێڕی بەبازاڕکردن', role: 'department', deptId: 'dept_finance', deptName: 'بەشی کارگێڕی بەبازاڕکردن', avatarColor: 'teal' },
        { username: 'statistics', password: 'stat123', name: 'بەڕێوەبەری بەشی ئامار و زانیاری', role: 'department', deptId: 'dept_statistics', deptName: 'بەشی ئامار و زانیاری', avatarColor: 'amber' }
    ];

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
        if (!db || isQuotaExceeded) return;

        // Check if remote has data or if we should perform initial seed
        const metaDocRef = db.collection('system_meta').doc('sync_state');

        // Always check if users or courses collection is empty on cloud
        db.collection('users').limit(1).get().then(uSnap => {
            if (uSnap.empty && !isQuotaExceeded) {
                console.log('[Firebase] Cloud users collection is empty. Pushing all users and courses now...');
                pushAllLocalToCloud(true);
            }
        }).catch(err => {
            handleFirestoreError(err, 'users check');
        });

        metaDocRef.get().then(doc => {
            if (isQuotaExceeded) return;
            if (!doc.exists) {
                console.log('[Firebase] Remote database is empty. Uploading initial local data to cloud...');
                pushAllLocalToCloud(true);
            } else {
                console.log('[Firebase] Cloud data exists. Pulling latest cloud changes...');
                pullAllCloudToLocal();
            }
        }).catch(err => {
            if (!handleFirestoreError(err, 'meta check')) {
                pullAllCloudToLocal();
            }
        });

        // Listen for Realtime Students changes
        try {
            db.collection('students').onSnapshot(snapshot => {
                if (isQuotaExceeded) return;
                
                // If local is currently writing, don't self-overwrite immediately
                if (isSyncing) return;

                const remoteStudents = [];
                snapshot.forEach(doc => {
                    remoteStudents.push(doc.data());
                });

                const localRaw = localStorage.getItem('college_students');
                const localStudents = localRaw ? JSON.parse(localRaw) : [];

                if (remoteStudents.length > 0) {
                    if (JSON.stringify(remoteStudents) !== JSON.stringify(localStudents)) {
                        console.log('[Firebase] Realtime students update received from cloud:', remoteStudents.length);
                        localStorage.setItem('college_students', JSON.stringify(remoteStudents));
                        notifyLocalApp('students_updated', remoteStudents);
                    }
                } else if (snapshot.empty && localStudents.length > 0) {
                    console.log('[Firebase] Cloud students collection is empty. Clearing local students...');
                    localStorage.setItem('college_students', JSON.stringify([]));
                    notifyLocalApp('students_updated', []);
                }
                lastSyncTime = new Date();
                updateBadgeTooltip();
            }, err => {
                if (handleFirestoreError(err, 'students')) return;
                console.warn('[Firebase] Students realtime listener error:', err.message);
            });

            // Listen for Realtime Sessions changes
            db.collection('attendance_sessions').onSnapshot(snapshot => {
                if (isQuotaExceeded) return;
                if (isSyncing) return;

                const remoteSessions = [];
                snapshot.forEach(doc => {
                    remoteSessions.push(doc.data());
                });

                const localRaw = localStorage.getItem('college_attendance_sessions');
                const localSessions = localRaw ? JSON.parse(localRaw) : [];

                if (remoteSessions.length > 0) {
                    if (JSON.stringify(remoteSessions) !== JSON.stringify(localSessions)) {
                        console.log('[Firebase] Realtime sessions update received from cloud:', remoteSessions.length);
                        // Sort sessions by date/createdAt desc
                        remoteSessions.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                        localStorage.setItem('college_attendance_sessions', JSON.stringify(remoteSessions));
                        notifyLocalApp('sessions_updated', remoteSessions);
                    }
                } else if (snapshot.empty && localSessions.length > 0) {
                    console.log('[Firebase] Cloud sessions collection is empty. Clearing local sessions...');
                    localStorage.setItem('college_attendance_sessions', JSON.stringify([]));
                    notifyLocalApp('sessions_updated', []);
                }
                lastSyncTime = new Date();
                updateBadgeTooltip();
            }, err => {
                if (handleFirestoreError(err, 'sessions')) return;
                console.warn('[Firebase] Sessions realtime listener error:', err.message);
            });

            // Listen for Realtime Courses (Teachers/Subjects) changes
            db.collection('courses').onSnapshot(snapshot => {
                if (isQuotaExceeded) return;
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
                if (handleFirestoreError(err, 'courses')) return;
                console.warn('[Firebase] Courses realtime listener error:', err.message);
            });

            // Listen for Realtime Users (Auth Accounts) changes
            db.collection('users').onSnapshot(snapshot => {
                if (isQuotaExceeded) return;
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
                if (handleFirestoreError(err, 'users')) return;
                console.warn('[Firebase] Users realtime listener error:', err.message);
            });

        } catch (e) {
            handleFirestoreError(e, 'setting up listeners');
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
        if (!db || isQuotaExceeded) return;
        try {
            setSyncingState(true);

            // Pull students
            const stuSnap = await db.collection('students').get();
            if (!stuSnap.empty) {
                const stuList = [];
                stuSnap.forEach(d => stuList.push(d.data()));
                localStorage.setItem('college_students', JSON.stringify(stuList));
                notifyLocalApp('students_updated', stuList);
            } else {
                localStorage.setItem('college_students', JSON.stringify([]));
                notifyLocalApp('students_updated', []);
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
            } else {
                localStorage.setItem('college_attendance_sessions', JSON.stringify([]));
                notifyLocalApp('sessions_updated', []);
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
            if (handleFirestoreError(error, 'pullAllCloudToLocal')) {
                return;
            }
            console.error('[Firebase] Error pulling cloud data:', error);
            renderStatusBadge('warning', 'کێشە لە خوێندنەوەی کلاود');
        } finally {
            setSyncingState(false);
        }
    }

    // Push local data up to cloud (Students, Sessions, Courses, Users, Audit Logs)
    async function pushAllLocalToCloud(isInitial = false) {
        if (!db || isQuotaExceeded) return;
        try {
            setSyncingState(true);
            renderStatusBadge('syncing', 'داتاکان دەنێردرێنە فایەربەیس...');

            // Merge default courses with any local additions
            let localCourses = JSON.parse(localStorage.getItem('college_courses') || '[]');
            const cMap = new Map();
            DEFAULT_COURSES.forEach(c => cMap.set(c.id, c));
            localCourses.forEach(c => cMap.set(c.id, c));
            localCourses = Array.from(cMap.values());
            originalSetItem.call(localStorage, 'college_courses', JSON.stringify(localCourses));

            // Merge base users, default courses as teachers, and any local additions
            let localUsers = JSON.parse(localStorage.getItem('college_auth_users') || '[]');
            const uMap = new Map();
            BASE_SYSTEM_USERS.forEach(u => uMap.set(u.username.toLowerCase(), u));
            localCourses.forEach(c => {
                if (c.username) {
                    uMap.set(c.username.toLowerCase().trim(), {
                        username: c.username.toLowerCase().trim(),
                        password: c.password,
                        name: c.teacherName,
                        role: 'teacher',
                        deptId: c.deptId || c.dept || 'dept_accounting',
                        dept: c.deptId || c.dept || 'dept_accounting',
                        subject: c.subject,
                        stage: String(c.stage || '1'),
                        totalHours: parseInt(c.totalHours) || 60,
                        avatarColor: 'indigo'
                    });
                }
            });
            localUsers.forEach(u => {
                if (u.username) uMap.set(u.username.toLowerCase().trim(), u);
            });
            localUsers = Array.from(uMap.values());
            originalSetItem.call(localStorage, 'college_auth_users', JSON.stringify(localUsers));

            const localStudents = JSON.parse(localStorage.getItem('college_students') || '[]');
            const localSessions = JSON.parse(localStorage.getItem('college_attendance_sessions') || '[]');
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
            if (handleFirestoreError(error, 'pushAllLocalToCloud')) {
                return false;
            }
            console.error('[Firebase] Error pushing local to cloud:', error);
            renderStatusBadge('error', 'هەڵە لە ناردنی داتا');
            return false;
        } finally {
            setSyncingState(false);
        }
    }

    // Single student save
    async function saveStudent(student) {
        if (!student || !student.id) return false;
        if (!db) initFirebase();
        if (!db) return false;
        try {
            const idStr = String(student.id);
            await db.collection('students').doc(idStr).set({
                ...student,
                id: idStr,
                stage: String(student.stage || '1'),
                dept: student.dept || student.deptId || 'dept_accounting',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log('[Firebase] ✅ Student synced to cloud:', student.name, 'Stage:', student.stage);
            return true;
        } catch (e) {
            handleFirestoreError(e, 'saveStudent');
            return false;
        }
    }

    // Single student delete
    async function deleteStudent(studentId) {
        if (!studentId) return false;
        if (!db) initFirebase();
        if (!db) return false;
        try {
            await db.collection('students').doc(String(studentId)).delete();
            console.log('[Firebase] ✅ Student removed from cloud:', studentId);
            return true;
        } catch (e) {
            handleFirestoreError(e, 'deleteStudent');
            return false;
        }
    }

    function withTimeout(promise, ms = 6000) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase network timeout')), ms))
        ]);
    }

    // Single course / teacher account save
    async function saveCourse(course) {
        if (!course || !course.id) return false;
        if (!db) initFirebase();
        if (!db) return false;
        try {
            const idStr = String(course.id);
            const deptKey = course.deptId || course.dept || 'dept_accounting';
            const uName = (course.username || '').toLowerCase().trim();
            const serverTs = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
                ? firebase.firestore.FieldValue.serverTimestamp()
                : new Date().toISOString();

            const courseData = {
                ...course,
                id: idStr,
                dept: deptKey,
                deptId: deptKey,
                stage: String(course.stage || '1'),
                username: uName,
                updatedAt: serverTs
            };
            await withTimeout(db.collection('courses').doc(idStr).set(courseData, { merge: true }), 6000);
            console.log('[Firebase] ✅ Course document saved to "courses" collection:', course.subject);
            
            // Also immediately register in users collection so login succeeds anywhere
            if (uName) {
                const userObj = {
                    username: uName,
                    password: String(course.password || ''),
                    name: course.teacherName || uName,
                    role: 'teacher',
                    deptId: deptKey,
                    dept: deptKey,
                    subject: course.subject,
                    stage: String(course.stage || '1'),
                    totalHours: parseInt(course.totalHours) || 60,
                    avatarColor: 'indigo',
                    updatedAt: serverTs
                };
                await withTimeout(db.collection('users').doc(uName).set(userObj, { merge: true }), 6000);
                console.log('[Firebase] ✅ Teacher user account registered in "users" collection:', uName);
            }
            return true;
        } catch (e) {
            console.error('[Firebase] ❌ Error saving course/teacher to Firestore:', e);
            handleFirestoreError(e, 'saveCourse');
            return false;
        }
    }

    // Single course delete
    async function deleteCourse(courseId) {
        if (!courseId) return false;
        if (!db) initFirebase();
        if (!db) return false;
        try {
            await withTimeout(db.collection('courses').doc(String(courseId)).delete(), 6000);
            console.log('[Firebase] ✅ Course deleted from cloud:', courseId);
            return true;
        } catch (e) {
            handleFirestoreError(e, 'deleteCourse');
            return false;
        }
    }

    // Single user save (Superadmin or Dept Head or Teacher)
    async function saveUser(user) {
        if (!user || !user.username) return false;
        if (!db) initFirebase();
        if (!db) return false;
        try {
            const uName = String(user.username).toLowerCase().trim();
            const serverTs = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
                ? firebase.firestore.FieldValue.serverTimestamp()
                : new Date().toISOString();

            const userPayload = {
                username: uName,
                password: String(user.password || ''),
                name: user.name || user.teacherName || uName,
                role: user.role || 'teacher',
                stage: String(user.stage || '1'),
                deptId: user.deptId || user.dept || null,
                dept: user.deptId || user.dept || null,
                deptName: user.deptName || '',
                subject: user.subject || '',
                totalHours: parseInt(user.totalHours) || 60,
                avatarColor: user.avatarColor || 'indigo',
                updatedAt: serverTs
            };
            await withTimeout(db.collection('users').doc(uName).set(userPayload, { merge: true }), 6000);
            console.log('[Firebase] ✅ User account document saved to "users" collection:', uName, userPayload);
            return true;
        } catch (e) {
            console.error('[Firebase] ❌ Error saving user to "users" collection:', e);
            handleFirestoreError(e, 'saveUser');
            return false;
        }
    }

    // Single user delete
    async function deleteUser(username) {
        if (!username) return false;
        if (!db) initFirebase();
        if (!db) return false;
        try {
            const uName = String(username).toLowerCase().trim();
            await db.collection('users').doc(uName).delete();
            console.log('[Firebase] ✅ User removed from "users" collection:', uName);
            return true;
        } catch (e) {
            handleFirestoreError(e, 'deleteUser');
            return false;
        }
    }

    // Direct Firestore REST API batch wipe (bypasses SDK, local server, and quota issues)
    async function wipeAllStudentsREST() {
        try {
            const apiKey = firebaseConfig.apiKey;
            const projectId = firebaseConfig.projectId;
            let pageToken = '';
            let allDocNames = [];

            do {
                let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students?pageSize=300&key=${apiKey}`;
                if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
                const res = await fetch(url);
                if (!res.ok) break;
                const data = await res.json();
                if (data.documents && data.documents.length) {
                    allDocNames = allDocNames.concat(data.documents.map(d => d.name));
                }
                pageToken = data.nextPageToken || '';
            } while (pageToken);

            if (allDocNames.length > 0) {
                const chunkSize = 200;
                for (let i = 0; i < allDocNames.length; i += chunkSize) {
                    const chunk = allDocNames.slice(i, i + chunkSize);
                    const commitPayload = {
                        writes: chunk.map(docName => ({ delete: docName }))
                    };
                    await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(commitPayload)
                    });
                }
            }

            // Update sync_state metadata in cloud
            const metaUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/system_meta/sync_state?key=${apiKey}&updateMask.fieldPaths=studentCount&updateMask.fieldPaths=lastSyncedAt`;
            await fetch(metaUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: {
                        studentCount: { integerValue: '0' },
                        lastSyncedAt: { timestampValue: new Date().toISOString() }
                    }
                })
            });
            return true;
        } catch (e) {
            console.warn('[Firebase] REST wipe students warning:', e);
            return false;
        }
    }

    async function wipeAllAttendanceSessionsREST() {
        try {
            const apiKey = firebaseConfig.apiKey;
            const projectId = firebaseConfig.projectId;
            let pageToken = '';
            let allDocNames = [];

            do {
                let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/attendance_sessions?pageSize=300&key=${apiKey}`;
                if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
                const res = await fetch(url);
                if (!res.ok) break;
                const data = await res.json();
                if (data.documents && data.documents.length) {
                    allDocNames = allDocNames.concat(data.documents.map(d => d.name));
                }
                pageToken = data.nextPageToken || '';
            } while (pageToken);

            if (allDocNames.length > 0) {
                const chunkSize = 200;
                for (let i = 0; i < allDocNames.length; i += chunkSize) {
                    const chunk = allDocNames.slice(i, i + chunkSize);
                    const commitPayload = {
                        writes: chunk.map(docName => ({ delete: docName }))
                    };
                    await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(commitPayload)
                    });
                }
            }
            return true;
        } catch (e) {
            console.warn('[Firebase] REST wipe sessions warning:', e);
            return false;
        }
    }

    // Wipe all students in cloud (used for End of Academic Year)
    async function wipeAllStudents() {
        if (!db) initFirebase();
        try {
            setSyncingState(true);
            if (db) {
                try {
                    const snapshot = await db.collection('students').get();
                    if (!snapshot.empty) {
                        const docs = snapshot.docs;
                        const chunkSize = 400;
                        for (let i = 0; i < docs.length; i += chunkSize) {
                            const chunk = docs.slice(i, i + chunkSize);
                            const batch = db.batch();
                            chunk.forEach(doc => {
                                batch.delete(doc.ref);
                            });
                            await batch.commit();
                        }
                    }
                } catch (sdkErr) {
                    console.warn('[Firebase] SDK batch delete warning, falling back to direct REST:', sdkErr);
                }
            }

            // Always execute direct Google REST API wipe for 100% cloud certainty
            await wipeAllStudentsREST();

            // Local Node server wipe if running
            try {
                await fetch('/api/students', { method: 'DELETE' });
            } catch (restErr) {}

            console.log('[Firebase] All students wiped in cloud for End of Academic Year.');
            renderStatusBadge('connected', 'تەواوی خوێندکاران سڕانەوە');
            return true;
        } catch (e) {
            console.error('[Firebase] Error wiping students:', e);
            await wipeAllStudentsREST();
            return false;
        } finally {
            setSyncingState(false);
        }
    }

    // Save attendance session
    async function saveAttendanceSession(session) {
        if (!session || !session.id) return false;
        if (!db) initFirebase();
        if (!db) return false;
        try {
            const sessId = String(session.id);
            const serverTs = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
                ? firebase.firestore.FieldValue.serverTimestamp()
                : new Date().toISOString();
            const sessionPayload = {
                ...session,
                id: sessId,
                dept: session.dept || session.deptId || 'dept_accounting',
                deptId: session.dept || session.deptId || 'dept_accounting',
                stage: String(session.stage || '1'),
                updatedAt: serverTs
            };
            await withTimeout(db.collection('attendance_sessions').doc(sessId).set(sessionPayload, { merge: true }), 6000);
            console.log('[Firebase] ✅ Attendance session synced to cloud:', session.subject, sessId);
            return true;
        } catch (e) {
            console.warn('[Firebase] ❌ Could not save attendance session to cloud:', e);
            handleFirestoreError(e, 'saveAttendanceSession');
            return false;
        }
    }

    // Wipe attendance sessions in cloud (used for End of Semester / Year)
    async function wipeAllAttendanceSessions() {
        if (!db) initFirebase();
        try {
            setSyncingState(true);
            if (db) {
                try {
                    const snapshot = await db.collection('attendance_sessions').get();
                    if (!snapshot.empty) {
                        const docs = snapshot.docs;
                        const chunkSize = 400;
                        for (let i = 0; i < docs.length; i += chunkSize) {
                            const chunk = docs.slice(i, i + chunkSize);
                            const batch = db.batch();
                            chunk.forEach(doc => {
                                batch.delete(doc.ref);
                            });
                            await batch.commit();
                        }
                    }
                } catch (sdkErr) {
                    console.warn('[Firebase] SDK batch delete sessions warning:', sdkErr);
                }
            }

            // Always execute direct REST wipe
            await wipeAllAttendanceSessionsREST();

            try {
                await fetch('/api/sessions', { method: 'DELETE' });
            } catch (restErr) {}

            console.log('[Firebase] Attendance sessions wiped in cloud.');
            return true;
        } catch (e) {
            console.error('[Firebase] Error wiping sessions:', e);
            await wipeAllAttendanceSessionsREST();
            return false;
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
            // Update in-memory global variables across active dashboards
            if (eventType === 'courses_updated' && Array.isArray(data)) {
                if (typeof courses !== 'undefined') courses = data;
            }
            if (eventType === 'students_updated' && Array.isArray(data)) {
                if (typeof students !== 'undefined') students = data;
            }
            if (eventType === 'sessions_updated' && Array.isArray(data)) {
                if (typeof attendanceSessions !== 'undefined') attendanceSessions = data;
            }

            // Update auth/course in teacher page if available
            if (typeof initAuthAndUser === 'function' && (eventType === 'courses_updated' || eventType === 'users_updated')) {
                initAuthAndUser();
            }

            // Check if page has render functions
            if (typeof renderAttendanceSheet === 'function') {
                renderAttendanceSheet();
            }
            if (typeof renderSuperAdminView === 'function') {
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

            // Dispatch global event for any modern listeners
            try {
                window.dispatchEvent(new CustomEvent('college_cloud_sync', { detail: { eventType, data } }));
            } catch (e) {}
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

        if (isSyncing) return;

        if (['college_students', 'college_attendance_sessions', 'college_courses', 'college_audit_logs', 'college_auth_users'].includes(key)) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (db && !isSyncing) {
                    console.log(`[Firebase AutoSync] Change detected in ${key}. Syncing to Firestore...`);
                    pushAllLocalToCloud(false);
                }
            }, 2000);
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
            badge.className = 'fixed bottom-14 sm:bottom-3 left-3 z-40 flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-xl text-[11px] sm:text-xs font-bold transition-all duration-300 hover:scale-105 cursor-pointer max-w-[90vw] whitespace-nowrap select-none';
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
