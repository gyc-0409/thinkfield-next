import pool from './db';

export async function createNotification(recipient, type, message, relatedId = null, relatedType = null) {
  try {
    await pool.query(
      'INSERT INTO notifications (recipient, type, message, related_id, related_type) VALUES ($1,$2,$3,$4,$5)',
      [recipient, type, message, relatedId, relatedType]
    );
  } catch (e) {
    console.error('创建通知失败:', e);
  }
}