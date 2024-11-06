// main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import axios from 'axios';  // 這是之前的 axios 添加
import ElementPlus from 'element-plus';  // 引入 element-plus
import 'element-plus/dist/index.css';  // 引入 element-plus 的樣式

// 添加請求攔截器
axios.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

const app = createApp(App);

app.use(router);
app.use(ElementPlus);  // 使用 element-plus
app.mount('#app');
