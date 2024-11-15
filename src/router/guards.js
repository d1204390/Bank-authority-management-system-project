import { ElMessage } from 'element-plus';

// Token 解析函數
export function getTokenInfo(token) {
    if (!token) return null;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error('Invalid token format');
            return null;
        }

        let payload = parts[1];

        // Base64 URL 解碼
        payload = payload.replace(/-/g, '+').replace(/_/g, '/');
        while (payload.length % 4) {
            payload += '=';
        }

        try {
            // 使用 Base64 解碼並正確處理 UTF-8
            const base64 = atob(payload);
            const utf8Bytes = new Uint8Array(base64.length);
            for (let i = 0; i < base64.length; i++) {
                utf8Bytes[i] = base64.charCodeAt(i);
            }
            const decodedString = new TextDecoder('utf-8').decode(utf8Bytes);
            const decoded = JSON.parse(decodedString);

            // 驗證 Token 是否過期
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                console.error('Token has expired');
                sessionStorage.removeItem('userInfo');
                return null;
            }

            // 數據驗證和標準化
            if (decoded.department) {
                const deptMap = {
                    'LD': 'LD',
                    'FD': 'FD',
                    'BD': 'BD',
                    '借貸部': 'LD',
                    '消金部': 'FD',
                    '業務部': 'BD'
                };
                decoded.department = deptMap[decoded.department] || decoded.department;
            }

            // 存儲解析後的用戶信息到 sessionStorage
            sessionStorage.setItem(
                'userInfo',
                JSON.stringify({
                    name: decoded.name,
                    department: decoded.department,
                    position: decoded.position
                })
            );

            return decoded;
        } catch (decodeError) {
            console.error('Payload decode error:', decodeError);
            sessionStorage.removeItem('userInfo');
            return null;
        }
    } catch (error) {
        console.error('Token parse error:', error);
        sessionStorage.removeItem('userInfo');
        return null;
    }
}

// 路由守衛設置函數
export function setupGuards(router) {
    let isNavigating = false;

    router.beforeEach(async (to, from, next) => {
        if (isNavigating) {
            next(false);
            return;
        }

        isNavigating = true;

        try {
            // 檢查是否有 token
            const token = localStorage.getItem('token');
            const tokenInfo = token ? getTokenInfo(token) : null;

            // 處理根路徑訪問
            if (to.path === '/') {
                if (tokenInfo) {
                    // 如果是管理員
                    if (tokenInfo.role === 'admin') {
                        next('/admin');
                        return;
                    }

                    // 一般用戶根據部門重定向
                    const redirectMap = {
                        'LD': '/loan/dashboard',
                        'FD': '/finance/dashboard',
                        'BD': '/business/dashboard'
                    };

                    const redirectPath = redirectMap[tokenInfo.department];
                    if (redirectPath) {
                        next(redirectPath);
                        return;
                    }
                }

                // 未登入用戶或無效 token，清除數據並允許訪問登入頁
                localStorage.removeItem('token');
                sessionStorage.removeItem('userInfo');
                next();
                return;
            }

            // 需要驗證的路由
            if (to.matched.some(record => record.meta.requiresAuth)) {
                if (!tokenInfo) {
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('userInfo');
                    ElMessage({
                        message: '請重新登入',
                        type: 'warning',
                        duration: 2000
                    });
                    next('/');
                    return;
                }

                // 檢查部門權限
                const requireDepartment = to.matched.some(record => record.meta.department);
                if (requireDepartment) {
                    if (tokenInfo.department !== to.meta.department) {
                        ElMessage({
                            message: '無權限訪問此頁面',
                            type: 'error',
                            duration: 2000
                        });
                        next(false);
                        return;
                    }
                }

                // 檢查職位權限
                const requirePosition = to.matched.some(record => record.meta.position);
                if (requirePosition && !to.meta.position.includes(tokenInfo.position)) {
                    ElMessage({
                        message: '無權限訪問此頁面',
                        type: 'error',
                        duration: 2000
                    });
                    next(false);
                    return;
                }

                // 檢查管理員權限
                if (to.meta.role === 'admin' && tokenInfo.role !== 'admin') {
                    ElMessage({
                        message: '無權限訪問此頁面',
                        type: 'error',
                        duration: 2000
                    });
                    next(false);
                    return;
                }

                next();
            } else {
                next();
            }
        } catch (error) {
            console.error('Navigation error:', error);
            ElMessage({
                message: '發生錯誤，請重試',
                type: 'error',
                duration: 2000
            });
            next(false);
        } finally {
            setTimeout(() => {
                isNavigating = false;
            }, 100);
        }
    });
}

// 調試輔助函數
export function debugToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found');
        return;
    }

    try {
        const tokenInfo = getTokenInfo(token);
        console.log('Token Info:', tokenInfo);
        console.log('Token Expiration:', new Date(tokenInfo.exp * 1000));
        console.log('Current Time:', new Date());
        console.log('Is Expired:', tokenInfo.exp * 1000 < Date.now());
    } catch (error) {
        console.error('Debug Token Error:', error);
    }
}