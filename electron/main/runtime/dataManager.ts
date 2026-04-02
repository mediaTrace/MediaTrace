import { SqliteDb } from '../storage/db/sqlite';
import * as XLSX from 'xlsx';
import path from 'node:path';
import fs from 'node:fs';
import { dialog } from 'electron';

export class DataManager {
  private db: SqliteDb;

  constructor(db: SqliteDb) {
    this.db = db;
  }

  /**
   * 批量删除数据
   */
  async deleteItems(table: string, ids: (number | string)[]) {
    if (!ids.length) return { success: true, changes: 0 };
    
    // 校验表名
    const validTables = ['douyin_aweme', 'douyin_aweme_comment', 'dy_creator', 'xhs_note', 'xhs_note_comment', 'xhs_creator'];
    if (!validTables.includes(table)) throw new Error('Invalid table');

    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM ${table} WHERE id IN (${placeholders})`;
    
    const result = await this.db.run(sql, ids);
    return { success: true, changes: result.changes };
  }

  /**
   * 导出数据到 Excel
   */
  async exportToExcel(table: string, ids?: (number | string)[]) {
    // 校验表名
    const validTables = ['douyin_aweme', 'douyin_aweme_comment', 'dy_creator', 'xhs_note', 'xhs_note_comment', 'xhs_creator'];
    if (!validTables.includes(table)) throw new Error('Invalid table');

    let rows: any[] = [];
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      rows = await this.db.all(`SELECT * FROM ${table} WHERE id IN (${placeholders})`, ids);
    } else {
      rows = await this.db.all(`SELECT * FROM ${table} ORDER BY add_ts DESC`);
    }

    if (!rows.length) {
      throw new Error('没有可导出的数据');
    }

    // 格式化列名（可选：可以将数据库字段映射为中文）
    const columnMap: Record<string, string> = {
      'nickname': '昵称',
      'content': '评论内容',
      'title': '视频标题',
      'desc': '描述',
      'create_time': '发布时间',
      'ip_location': 'IP属地',
      'liked_count': '点赞数',
      'comment_count': '评论数',
      'share_count': '分享数',
      'aweme_url': '链接',
      'phone': '手机号',
      'add_ts': '采集时间'
    };

    const formattedRows = rows.map(row => {
      const newRow: any = {};
      for (const key in row) {
        const label = columnMap[key] || key;
        let value = row[key];
        
        // 处理时间戳
        if (key === 'create_time' || key === 'add_ts' || key === 'last_modify_ts') {
          if (value) value = new Date(value).toLocaleString();
        }
        
        newRow[label] = value;
      }
      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // 弹出保存对话框
    const { filePath } = await dialog.showSaveDialog({
      title: '导出数据',
      defaultPath: path.join(process.env.USERPROFILE || '', 'Downloads', `${table}_${Date.now()}.xlsx`),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (filePath) {
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      fs.writeFileSync(filePath, buffer);
      
      // 更新导出状态
      if (ids && ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        await this.db.run(`UPDATE ${table} SET is_exported = 1 WHERE id IN (${placeholders})`, ids);
      } else {
        await this.db.run(`UPDATE ${table} SET is_exported = 1`);
      }

      return { success: true, filePath };
    }

    return { success: false, message: '取消导出' };
  }
}
