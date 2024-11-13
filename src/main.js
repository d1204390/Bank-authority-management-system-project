// main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import axios from 'axios';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

// 設置 Axios 的基礎 URL
axios.defaults.baseURL = 'http://localhost:5000';  // 根據您的後端伺服器的地址和端口進行調整

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
app.use(ElementPlus);
app.mount('#app');
