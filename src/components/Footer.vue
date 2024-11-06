<template>
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-content">
        <div class="footer-section">
          <h3>系統資訊</h3>
          <p>版本：V1.0.0 | 最後更新：2024/03/23</p>
        </div>
        <div class="footer-section">
          <h3>技術支援</h3>
          <p>分機：1234 | Email：support@systex.com</p>
        </div>
        <div class="footer-section">
          <h3>快速連結</h3>
          <p>
            <a href="#" class="footer-link">公司官方網站</a> |
            <a href="#" class="footer-link">公司知識庫</a> |
            <a href="#" class="footer-link">系統操作手冊</a>
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'TheFooter'
}
</script>

<style scoped>
.footer {
  background-color: #f5f5f5;
  padding: 0.8rem 0;
  margin-top: auto;
  border-top: 1px solid #e0e0e0;
  font-size: 0.8rem;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.footer-section h3 {
  color: #333;
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.footer-section p {
  color: #666;
  line-height: 1.4;
  margin: 0;
}

.footer-link {
  color: #666;
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: #333;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 0.5rem;
  }

  .footer {
    background-color: #f5f5f5;
    padding: 0.8rem 0;
    border-top: 1px solid #e0e0e0;
    font-size: 0.8rem;
    /* 移除 margin-top: auto */
  }
}
</style>